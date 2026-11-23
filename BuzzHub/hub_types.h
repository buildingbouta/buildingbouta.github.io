// Types shared across the sketch (kept in a header so Arduino's auto-generated
// function prototypes can see them).
#pragma once
#include <Arduino.h>

enum EvKind : uint8_t { EV_OPEN, EV_MSG, EV_CLOSE };
struct Ev { EvKind kind; uint32_t cid; String data; };

struct RxBuf { uint32_t cid; String buf; bool used; };

enum Role : uint8_t { R_NONE, R_PLAYER, R_HOST, R_GAME };
struct Conn { bool used; uint32_t cid; Role role; int8_t player; uint32_t lastBuzz; };

struct Player { bool used; char id[41]; uint8_t slot; String name; char team; uint8_t online; };

enum GameLink : uint8_t { G_NONE, G_WS, G_SERIAL };
