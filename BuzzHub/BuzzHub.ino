/*
  Buzz Hub firmware for the Seeed XIAO ESP32S3.

  Copyright (c) 2026 David Bouthot. Released under the MIT License.
  See the LICENSE file in this folder.

  The board makes its own Wi-Fi network, serves the phone buzzer page and the
  host remote page, and passes messages between the phones and the game running
  on the laptop. The game can link over Wi-Fi (WebSocket) or over the USB cable
  (USB serial, Chrome/Edge only). When no game is linked, phone buzzes and the
  host's Right/Wrong are typed on the laptop as keys (1-9, 0, r, w), exactly like
  the wireless buzzer receiver.

  Arduino IDE settings (Tools menu):
    Board:        XIAO_ESP32S3            (esp32 by Espressif, 3.x)
    USB Mode:     USB-OTG (TinyUSB)       (change this: the menu starts on "Hardware CDC and JTAG")
    USB CDC On Boot: Enabled              (already the default)
  Libraries (Library Manager):
    "ESP Async WebServer" by ESP32Async, "Async TCP" by ESP32Async, "ArduinoJson" by Benoit Blanchon (v7)

  Settings you may want to change are in config.h.
  The web pages live in web_assets.h, generated from the web folder by tools/build.py.
*/
#include "config.h"

#if !defined(ARDUINO_USB_MODE) || ARDUINO_USB_MODE != 0
#error "Set Tools > USB Mode to 'USB-OTG (TinyUSB)' so the board can act as a keyboard."
#endif
#if !ARDUINO_USB_CDC_ON_BOOT
#error "Set Tools > USB CDC On Boot to 'Enabled' so the game can link over the USB cable."
#endif

#include <WiFi.h>
#include <DNSServer.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include "USB.h"
#include "USBHIDKeyboard.h"
#include "web_assets.h"
#include "hub_types.h"

static const IPAddress AP_IP(192, 168, 4, 1);
static const uint32_t PEER_TIMEOUT_MS = 12000;
static const size_t MAX_MSG = 16384;

USBHIDKeyboard Keyboard;
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
DNSServer dns;
int apLimit = 0;

// ------------------------------------------------------------ event queue
// WebSocket callbacks run on the network task; everything else runs in loop().
// Callbacks only copy messages into this queue, so the game state has one owner.
QueueHandle_t evq;

RxBuf rx[16];                         // only touched on the network task

RxBuf *rxFor(uint32_t cid, bool create) {
  for (auto &r : rx) if (r.used && r.cid == cid) return &r;
  if (!create) return nullptr;
  for (auto &r : rx) if (!r.used) { r.used = true; r.cid = cid; r.buf = ""; return &r; }
  return nullptr;
}
void pushEv(EvKind k, uint32_t cid, const String &d) {
  Ev *e = new Ev{ k, cid, d };
  if (xQueueSend(evq, &e, 0) != pdTRUE) delete e;
}

void onWsEvent(AsyncWebSocket *, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  uint32_t cid = client->id();
  if (type == WS_EVT_CONNECT) { pushEv(EV_OPEN, cid, ""); return; }
  if (type == WS_EVT_DISCONNECT) { RxBuf *r = rxFor(cid, false); if (r) { r->used = false; r->buf = ""; } pushEv(EV_CLOSE, cid, ""); return; }
  if (type != WS_EVT_DATA) return;
  AwsFrameInfo *info = (AwsFrameInfo *)arg;
  if (info->opcode == WS_BINARY) return;
  RxBuf *r = rxFor(cid, true);
  if (!r) return;
  if (info->index == 0 && info->num == 0) r->buf = "";
  if (r->buf.length() + len > MAX_MSG) { r->buf = ""; return; }
  r->buf.concat((const char *)data, len);
  if (info->final && info->index + len == info->len) { pushEv(EV_MSG, cid, r->buf); r->buf = ""; }
}

// ------------------------------------------------------------ state
Conn conns[20];

Player players[32];

bool locked = false;
GameLink gameLink = G_NONE;
uint32_t gameCid = 0;
uint32_t serialLastRx = 0;
String pstate = "", hstate = "";      // raw JSON of the last states from the game
bool laptopName[HUB_SLOTS + 1];       // slots with a name typed on the laptop

Conn *connFor(uint32_t cid) { for (auto &c : conns) if (c.used && c.cid == cid) return &c; return nullptr; }
Player *slotHolder(uint8_t slot) { for (auto &p : players) if (p.used && p.slot == slot) return &p; return nullptr; }

String toJson(JsonDocument &d) { String s; serializeJson(d, s); return s; }
void sendTo(uint32_t cid, const String &s) { ws.text(cid, s); }
void sendGame(const String &s) {
  if (gameLink == G_WS) ws.text(gameCid, s);
  else if (gameLink == G_SERIAL) { Serial.print(s); Serial.print('\n'); }
}
template <typename F> void eachConn(Role role, F fn) { for (auto &c : conns) if (c.used && c.role == role) fn(c); }
void sendPlayerSockets(Player *p, const String &s) { int idx = p - players; eachConn(R_PLAYER, [&](Conn &c) { if (c.player == idx) sendTo(c.cid, s); }); }

// ---- messages ----
String youMsg(Player *p) {
  JsonDocument d; d["t"] = "you";
  if (p && p->slot) d["slot"] = p->slot; else d["slot"] = nullptr;
  d["name"] = p ? p->name : "";
  if (p && p->team) d["team"] = String(p->team); else d["team"] = nullptr;
  d["locked"] = locked;
  return toJson(d);
}
bool isTaken(uint8_t s, Player *except) {
  Player *h = slotHolder(s);
  if (h && h != except) return true;
  return !h && laptopName[s];
}
String slotsMsg() {
  JsonDocument d; d["t"] = "slots"; d["max"] = HUB_SLOTS;
  JsonArray a = d["taken"].to<JsonArray>();
  for (uint8_t s = 1; s <= HUB_SLOTS; s++) if (isTaken(s, nullptr)) a.add(s);
  return toJson(d);
}
String rosterMsg() {
  JsonDocument d; d["t"] = "roster"; d["locked"] = locked; d["game"] = gameLink != G_NONE;
  JsonArray a = d["players"].to<JsonArray>();
  for (uint8_t s = 1; s <= HUB_SLOTS; s++) {
    Player *p = slotHolder(s); if (!p) continue;
    JsonObject o = a.add<JsonObject>();
    o["slot"] = s; o["name"] = p->name; o["online"] = p->online > 0;
    if (p->team) o["team"] = String(p->team); else o["team"] = nullptr;
  }
  return toJson(d);
}
String linkMsg() { JsonDocument d; d["t"] = "link"; d["game"] = gameLink != G_NONE; return toJson(d); }
String errMsg(const char *m) { JsonDocument d; d["t"] = "err"; d["msg"] = m; return toJson(d); }

void rosterChanged() {
  String r = rosterMsg();
  eachConn(R_HOST, [&](Conn &c) { sendTo(c.cid, r); });
  sendGame(r);
  String s = slotsMsg();
  eachConn(R_PLAYER, [&](Conn &c) { sendTo(c.cid, s); });
}
void linkChanged() {
  String m = linkMsg();
  eachConn(R_PLAYER, [&](Conn &c) { sendTo(c.cid, m); });
  eachConn(R_HOST, [&](Conn &c) { sendTo(c.cid, m); });
}
void youChangedAll() { for (auto &p : players) if (p.used && p.online) sendPlayerSockets(&p, youMsg(&p)); }

void typeKey(char k) { Keyboard.write((uint8_t)k); }
char keyForSlot(uint8_t s) { return s == 10 ? '0' : char('0' + s); }

String cleanName(const char *in) {
  String s = in ? in : "";
  String out;
  for (size_t i = 0; i < s.length(); i++) { char ch = s[i]; if ((uint8_t)ch < 0x20 || ch == '<' || ch == '>') continue; out += ch; }
  out.trim();
  // cut to 16 characters without splitting a UTF-8 sequence
  size_t chars = 0, i = 0;
  while (i < out.length() && chars < 16) { uint8_t b = out[i]; i += (b >= 0xF0) ? 4 : (b >= 0xE0) ? 3 : (b >= 0xC0) ? 2 : 1; chars++; }
  out = out.substring(0, min(i, (size_t)out.length()));
  out.trim();
  return out;
}
String uniqueName(const String &name, Player *self) {
  for (auto &p : players)
    if (p.used && &p != self && p.slot && p.name.equalsIgnoreCase(name)) return name.substring(0, 12) + " (" + String(self->slot) + ")";
  return name;
}

void clearPlayer(Player *p) { p->slot = 0; p->name = ""; p->team = 0; }

Player *playerFor(const char *id) {
  for (auto &p : players) if (p.used && strcmp(p.id, id) == 0) return &p;
  Player *slotless = nullptr;
  for (auto &p : players) {
    if (!p.used) { slotless = &p; break; }
    if (!slotless && !p.slot && !p.online) slotless = &p;
  }
  if (!slotless) return nullptr;
  Player &p = *slotless;
  p.used = true; strlcpy(p.id, id, sizeof(p.id)); clearPlayer(&p); p.online = 0;
  return &p;
}

// ------------------------------------------------------------ message handling
void onGameState(JsonDocument &m, bool host) {
  String s; serializeJson(m["s"], s);
  if (host) {
    hstate = s;
    String out = "{\"t\":\"hstate\",\"s\":" + s + "}";
    eachConn(R_HOST, [&](Conn &c) { sendTo(c.cid, out); });
    return;
  }
  pstate = s;
  bool changed = false;
  JsonArray names = m["s"]["playerNames"];
  for (uint8_t i = 1; i <= HUB_SLOTS; i++) {
    const char *n = names[i - 1] | "";
    bool has = strlen(n) > 0 && !slotHolder(i);
    if (has != laptopName[i]) { laptopName[i] = has; changed = true; }
  }
  String out = "{\"t\":\"state\",\"s\":" + s + "}";
  eachConn(R_PLAYER, [&](Conn &c) { sendTo(c.cid, out); });
  if (changed) { String sm = slotsMsg(); eachConn(R_PLAYER, [&](Conn &c) { sendTo(c.cid, sm); }); }
}

void becomeGame(GameLink via, uint32_t cid) {
  if (gameLink == G_WS && !(via == G_WS && cid == gameCid)) { ws.text(gameCid, "{\"t\":\"replaced\"}"); Conn *old = connFor(gameCid); if (old) old->role = R_NONE; }
  if (gameLink == G_SERIAL && via != G_SERIAL) { Serial.print("{\"t\":\"replaced\"}\n"); }
  gameLink = via; gameCid = cid;
  JsonDocument d; d["t"] = "cfg"; d["ssid"] = HUB_WIFI_NAME; d["pass"] = HUB_WIFI_PASSWORD;
  d["ip"] = AP_IP.toString(); d["slots"] = HUB_SLOTS; d["pin"] = HUB_HOST_PIN; d["via"] = via == G_SERIAL ? "usb" : "wifi";
  sendGame(toJson(d));
  sendGame(rosterMsg());
  linkChanged();
}
void dropGame() {
  if (gameLink == G_NONE) return;
  gameLink = G_NONE; gameCid = 0;
  linkChanged(); rosterChanged();
}

// Messages from the laptop game, whether over Wi-Fi or USB.
void handleGame(JsonDocument &m) {
  const char *t = m["t"] | "";
  if (!strcmp(t, "pstate")) onGameState(m, false);
  else if (!strcmp(t, "hstate")) onGameState(m, true);
}

void handleWs(uint32_t cid, const String &raw) {
  JsonDocument m;
  if (deserializeJson(m, raw)) return;
  const char *t = m["t"] | "";
  Conn *c = connFor(cid);
  if (!c) return;
  if (!strcmp(t, "ping")) { sendTo(cid, "{\"t\":\"pong\"}"); return; }

  if (!strcmp(t, "hello")) {
    const char *role = m["role"] | "";
    if (c->role != R_NONE) return;           // one hello per connection
    if (!strcmp(role, "player")) {
      const char *id = m["id"] | "";
      if (!*id || strlen(id) > 40) return;
      Player *p = playerFor(id);
      if (!p) { sendTo(cid, errMsg("The hub is full. Try again in a minute.")); return; }
      c->role = R_PLAYER; c->player = p - players; p->online++;
      sendTo(cid, youMsg(p)); sendTo(cid, slotsMsg()); sendTo(cid, linkMsg());
      if (pstate.length()) sendTo(cid, "{\"t\":\"state\",\"s\":" + pstate + "}");
      rosterChanged();
    } else if (!strcmp(role, "host")) {
      if (strcmp(m["pin"] | "", HUB_HOST_PIN) != 0) { sendTo(cid, "{\"t\":\"auth\",\"ok\":false}"); return; }
      c->role = R_HOST;
      sendTo(cid, "{\"t\":\"auth\",\"ok\":true}"); sendTo(cid, rosterMsg()); sendTo(cid, linkMsg());
      if (hstate.length()) sendTo(cid, "{\"t\":\"hstate\",\"s\":" + hstate + "}");
    } else if (!strcmp(role, "game")) {
      c->role = R_GAME;
      becomeGame(G_WS, cid);
    }
    return;
  }

  if (c->role == R_PLAYER && c->player >= 0) {
    Player *p = &players[c->player];
    if (!strcmp(t, "join")) {
      String name = cleanName(m["name"] | "");
      if (!name.length()) { sendTo(cid, errMsg("Type a name first.")); return; }
      if (locked && p->slot && name != p->name) { sendTo(cid, errMsg("Names are locked by the host.")); return; }
      if (locked && !p->slot) { sendTo(cid, errMsg("The host has locked joining for now.")); return; }
      int slot = m["slot"].isNull() ? p->slot : (int)(m["slot"] | 0);
      if (slot == 0) {
        for (uint8_t s = 1; s <= HUB_SLOTS; s++) if (!isTaken(s, p)) { slot = s; break; }
        if (slot == 0) { sendTo(cid, errMsg("All buzzer slots are full.")); return; }
      }
      if (slot < 1 || slot > HUB_SLOTS) { sendTo(cid, errMsg("Pick a buzzer number from the grid.")); return; }
      if (isTaken(slot, p)) { sendTo(cid, errMsg("That buzzer number is taken.")); return; }
      p->slot = slot;
      p->name = uniqueName(name, p);
      const char *team = m["team"] | "";
      if (!strcmp(team, "A") || !strcmp(team, "B")) p->team = team[0];
      sendPlayerSockets(p, youMsg(p));
      rosterChanged();
    } else if (!strcmp(t, "leave")) {
      if (locked) { sendTo(cid, errMsg("Names are locked by the host.")); return; }
      clearPlayer(p); sendPlayerSockets(p, youMsg(p)); rosterChanged();
    } else if (!strcmp(t, "buzz")) {
      if (!p->slot) return;
      uint32_t now = millis();
      if (c->lastBuzz && now - c->lastBuzz < 120) return;
      c->lastBuzz = now;
      if (gameLink != G_NONE) sendGame("{\"t\":\"buzz\",\"slot\":" + String(p->slot) + "}");
      else typeKey(keyForSlot(p->slot));
      sendTo(cid, "{\"t\":\"buzzed\"}");
      digitalWrite(LED_BUILTIN, HIGH);          // quick blink (LED is active-low)
    } else if (!strcmp(t, "pick")) {
      // A buzzed-in player chose an answer (A-D) on their phone. Only meaningful when a game is linked.
      if (!p->slot || gameLink == G_NONE) return;
      int choice = m["i"] | -1;
      if (choice < 0 || choice > 7) return;
      sendGame("{\"t\":\"pick\",\"slot\":" + String(p->slot) + ",\"i\":" + String(choice) + "}");
      sendTo(cid, "{\"t\":\"picked\",\"i\":" + String(choice) + "}");
    }
    return;
  }

  if (c->role == R_HOST) {
    if (!strcmp(t, "cmd")) {
      JsonObject cmd = m["c"];
      if (cmd.isNull()) return;
      if (gameLink != G_NONE) { JsonDocument d; d["t"] = "cmd"; d["c"] = cmd; sendGame(toJson(d)); return; }
      const char *k = cmd["k"] | ""; const char *key = cmd["key"] | "";
      if (!strcmp(k, "key") && strlen(key) == 1 && strchr("rRwW", key[0])) typeKey(tolower(key[0]));
    } else if (!strcmp(t, "lock")) {
      locked = m["on"] | false; youChangedAll(); rosterChanged();
    } else if (!strcmp(t, "kick")) {
      uint8_t s = m["slot"] | 0; Player *p = slotHolder(s);
      if (p) { clearPlayer(p); sendPlayerSockets(p, youMsg(p)); sendPlayerSockets(p, errMsg("The host removed you from that slot.")); }
      sendGame("{\"t\":\"kicked\",\"slot\":" + String(s) + "}");
      rosterChanged();
    } else if (!strcmp(t, "rename")) {
      uint8_t s = m["slot"] | 0; Player *p = slotHolder(s); String name = cleanName(m["name"] | "");
      if (p && name.length()) { p->name = uniqueName(name, p); sendPlayerSockets(p, youMsg(p)); rosterChanged(); }
    }
    return;
  }

  if (c->role == R_GAME && gameLink == G_WS && gameCid == cid) handleGame(m);
}

void onOpen(uint32_t cid) {
  for (auto &c : conns) if (!c.used) { c = Conn{ true, cid, R_NONE, -1, 0 }; return; }
  ws.close(cid);   // table full
}
void onClose(uint32_t cid) {
  Conn *c = connFor(cid); if (!c) return;
  if (c->role == R_PLAYER && c->player >= 0) { Player &p = players[c->player]; if (p.online) p.online--; rosterChanged(); }
  if (c->role == R_GAME && gameLink == G_WS && gameCid == cid) dropGame();
  c->used = false;
}

// ------------------------------------------------------------ USB serial link
String serialLine;
void pollSerial() {
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (serialLine.length() && serialLine[0] == '{') {
        JsonDocument m;
        if (!deserializeJson(m, serialLine)) {
          serialLastRx = millis();
          const char *t = m["t"] | "";
          if (!strcmp(t, "ping")) Serial.print("{\"t\":\"pong\"}\n");
          else if (!strcmp(t, "hello") && !strcmp(m["role"] | "", "game")) becomeGame(G_SERIAL, 0);
          else if (gameLink == G_SERIAL) handleGame(m);
        }
      }
      serialLine = "";
    } else if (serialLine.length() < MAX_MSG) serialLine += ch;
  }
  if (gameLink == G_SERIAL && millis() - serialLastRx > PEER_TIMEOUT_MS) dropGame();
}

// ------------------------------------------------------------ web server
void sendPage(AsyncWebServerRequest *req, const uint8_t *gz, size_t len) {
  AsyncWebServerResponse *r = req->beginResponse(200, "text/html", gz, len);
  r->addHeader("Content-Encoding", "gzip");
  r->addHeader("Cache-Control", "no-store");
  req->send(r);
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  Keyboard.begin();
  USB.begin();
  Serial.begin(115200);
  evq = xQueueCreate(64, sizeof(Ev *));

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_IP, IPAddress(255, 255, 255, 0));
  const char *pass = strlen(HUB_WIFI_PASSWORD) ? HUB_WIFI_PASSWORD : nullptr;
  // Ask for room for 10 players + host phone + laptop; fall back if this build allows fewer.
  const int limits[] = { 13, 12, 10, 8 };
  for (int lim : limits) if (WiFi.softAP(HUB_WIFI_NAME, pass, HUB_WIFI_CHANNEL, 0, lim)) { apLimit = lim; break; }
  WiFi.setSleep(false);                          // lower latency for buzzes
  Serial.printf("# Buzz Hub ready: Wi-Fi \"%s\", up to %d devices, http://%s/\n", HUB_WIFI_NAME, apLimit, AP_IP.toString().c_str());

  // Every name resolves to the board, so phones' connectivity checks reach us.
  dns.setErrorReplyCode(DNSReplyCode::NoError);
  dns.start(53, "*", AP_IP);

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *r) { sendPage(r, PLAYER_HTML_GZ, PLAYER_HTML_GZ_LEN); });
  server.on("/host", HTTP_GET, [](AsyncWebServerRequest *r) { sendPage(r, HOST_HTML_GZ, HOST_HTML_GZ_LEN); });
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *r) {
    String s = String("{\"wifiName\":\"") + HUB_WIFI_NAME + "\",\"deviceLimit\":" + apLimit +
               ",\"devicesOnWifi\":" + WiFi.softAPgetStationNum() + ",\"sockets\":" + ws.count() +
               ",\"gameLinked\":" + (gameLink == G_NONE ? "false" : "true") + ",\"link\":\"" +
               (gameLink == G_SERIAL ? "usb" : gameLink == G_WS ? "wifi" : "none") + "\",\"freeHeap\":" + ESP.getFreeHeap() +
               ",\"uptimeSec\":" + (millis() / 1000) + "}";
    AsyncWebServerResponse *res = r->beginResponse(200, "application/json", s);
    res->addHeader("Access-Control-Allow-Origin", "*");     // lets the local check page read it
    r->send(res);
  });
#if !HUB_CAPTIVE_PORTAL
  // Answer the phones' "am I online?" checks so they stay on the Wi-Fi without a sign-in pop-up.
  server.on("/hotspot-detect.html", HTTP_GET, [](AsyncWebServerRequest *r) {
    r->send(200, "text/html", "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");
  });
  server.on("/library/test/success.html", HTTP_GET, [](AsyncWebServerRequest *r) {
    r->send(200, "text/html", "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");
  });
  server.on("/generate_204", HTTP_GET, [](AsyncWebServerRequest *r) { r->send(204); });
  server.on("/gen_204", HTTP_GET, [](AsyncWebServerRequest *r) { r->send(204); });
  server.on("/connecttest.txt", HTTP_GET, [](AsyncWebServerRequest *r) { r->send(200, "text/plain", "Microsoft Connect Test"); });
  server.on("/ncsi.txt", HTTP_GET, [](AsyncWebServerRequest *r) { r->send(200, "text/plain", "Microsoft NCSI"); });
  server.on("/success.txt", HTTP_GET, [](AsyncWebServerRequest *r) { r->send(200, "text/plain", "success\n"); });
#endif
  // Anything else (a typo, or a sign-in pop-up) lands on the buzzer page.
  server.onNotFound([](AsyncWebServerRequest *r) { r->redirect("http://192.168.4.1/"); });
  server.begin();
}

void loop() {
  dns.processNextRequest();
  Ev *e;
  while (xQueueReceive(evq, &e, 0) == pdTRUE) {
    if (e->kind == EV_OPEN) onOpen(e->cid);
    else if (e->kind == EV_CLOSE) onClose(e->cid);
    else handleWs(e->cid, e->data);
    delete e;
  }
  pollSerial();

  static uint32_t lastTick = 0;
  uint32_t now = millis();
  if (now - lastTick >= 250) {
    lastTick = now;
    ws.cleanupClients();
    // LED: steady on when a game is linked, slow blink when waiting (active-low)
    bool on = gameLink != G_NONE ? true : ((now / 1000) % 2 == 0);
    digitalWrite(LED_BUILTIN, on ? LOW : HIGH);
  }
  delay(1);
}
