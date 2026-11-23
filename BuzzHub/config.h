// ============================================================
//  Buzz Hub settings. Change these, then upload again.
// ============================================================
#pragma once

// Wi-Fi network the board creates. Players join this network.
#define HUB_WIFI_NAME      "BuzzHub"
// 8+ characters, or "" for an open network (no password).
#define HUB_WIFI_PASSWORD  ""
// Wi-Fi channel 1, 6 or 11 are usually the least crowded.
#define HUB_WIFI_CHANNEL   6

// PIN for the host remote page (http://192.168.4.1/host). Set your own.
#define HUB_HOST_PIN       "0000"

// Number of player buzzers (the games support 10).
#define HUB_SLOTS          10

// 0 (recommended): phones join the Wi-Fi quietly and players open the buzzer
//    page by scanning the second QR code. The page then runs in the phone's
//    normal browser, which keeps the player's slot if the phone sleeps.
// 1: phones pop up a "Sign in to network" screen with the buzzer page in it.
//    Quicker to join, but that pop-up browser forgets players when closed,
//    and on iPhone closing it can drop the Wi-Fi connection.
#define HUB_CAPTIVE_PORTAL 0
