# Science Game Shows

Four editions (STEM, Rock Stars, Deep Dive and STEAM Lab), each with the same four games. Play them at https://buildingbouta.github.io/games/ or download any file and open it in a browser. The guide below was written for the STEM Edition; the other editions work the same way. Question templates for three of the editions are in the `templates` folder.

---

## STEM Edition guide

Four standalone, offline-ready trivia game shows built for Earth Science outreach events. No install, no server, and no internet required beyond optional Google-hosted fonts. Each file runs entirely in the browser it's opened in.

## Index

1. [What's in this package](#1-whats-in-this-package)
2. [Quick start](#2-quick-start)
3. [Features every game shares](#3-features-every-game-shares)
   - [3.1 Two screens: Host Control + Contestant Display](#31-two-screens-host-control--contestant-display)
   - [3.2 Four ways to buzz in](#32-four-ways-to-buzz-in)
   - [3.3 The Settings panel](#33-the-settings-panel)
   - [3.4 Editing the question bank](#34-editing-the-question-bank)
   - [3.5 Reset links & display size](#35-reset-links--display-size)
4. [Game guides](#4-game-guides)
   - [4.1 100 Questions](#41-100-questions)
   - [4.2 Category Board](#42-category-board)
   - [4.3 Bluffing Trivia](#43-bluffing-trivia)
   - [4.4 Survey Showdown](#44-survey-showdown)
5. [Troubleshooting](#5-troubleshooting)
6. [Reworking this for your own event](#6-reworking-this-for-your-own-event)

---

## 1. What's in this package

| File | Format |
|---|---|
| `01 - 100 Questions (STEM Edition).html` | 5 topics × Beginner/Advanced rounds, buzz-in multiple choice |
| `02 - Category Board (STEM Edition).html` | Classic 5×5 category/point-value board |
| `03 - Bluffing Trivia (STEM Edition).html` | "Which one is real?": one true answer hides among plausible fakes |
| `04 - Survey Showdown (STEM Edition).html` | Two teams, survey-style board, face-off plus steal |

All four share the same dark, "mission control" visual style, the same Earth Science logo, and the same player-buzzing and Settings system described in Section 3.

## 2. Quick start

1. Double-click a game's `.html` file. It opens in your default browser as the **Host Control** screen. This is what you, the host, look at.
2. Click **Open contestant display**. A second window opens. Drag this to your projector, TV, or second monitor. This is what the audience/players see.
3. Fill in player names in the **Buzzer 1–10** boxes (leave blank to turn a buzzer off).
4. Play! See Section 4 for how each game specifically runs.

> Keep the Host Control tab open for the whole event. Closing it also closes the contestant display window.

## 3. Features every game shares

### 3.1 Two screens: Host Control + Contestant Display

- **Host Control**: only you see this. Shows correct answers ahead of time, has all the scoring/admin buttons.
- **Contestant Display**: safe for the audience to see. Automatically stays in sync with whatever the host does, live.
- Use the **Display size** `−` / `+` buttons on the host screen to shrink or enlarge the contestant window if it doesn't fit your projector well.

### 3.2 Four ways to buzz in

Every game supports all four, so use whichever fits your hardware:

1. **Tap a "Buzz in" tile** next to a player's name on the Host Control screen.
2. **Tap a tile on the Contestant Display** screen itself (only appears while a question is live). Good if that screen is a touchscreen or tablet.
3. **Press a number key** (1–9, then 0 for buzzer 10) on any keyboard connected to either screen.
4. **A physical USB buzzer system**, if you have one wired to send those same number keys.

No physical buzzers are required. Tapping tiles is a full substitute.

Once someone buzzes in, the host presses **R** (or clicks the correct-answer button) to award points, or **W** (or the wrong-answer button) if they got it wrong. A miss just locks that one player out of the current question so everyone else can still try.

### 3.3 The Settings panel

Click **Settings** on the Host Control screen (next to "Open contestant display"). It has:

- **Show title**: the text shown at the top of both screens. Type to change it; updates live on the contestant display too.
- **Background image**: upload a PNG (2 MB max) to replace the faint default logo watermark behind the board, with an opacity slider to control how strong it shows. "Use default logo" reverts it.
- **Categories** *(100 Questions, Category Board, and Bluffing Trivia only; Survey Showdown has no categories)*: rename any of the 5 subject sections and/or upload a custom PNG icon for it. Each of the 5 sections is a fixed "slot," so renaming one only changes its label and icon. It never moves or loses the questions already assigned to it.

### 3.4 Editing the question bank

In the **Question bank** section near the bottom of the Host Control screen:

- **Export to Excel** downloads the current questions as a spreadsheet.
- Edit it in Excel or Google Sheets: add, remove, or reword questions.
- **Import from Excel** loads your edited file back in. Badly formatted files are rejected with an explanation rather than corrupting the current bank, so it's safe to experiment.

### 3.5 Reset links & display size

- **Reset questions**: makes the full question bank available again (for a re-run or a second session). Asks for confirmation first.
- **Reset scores**: zeroes every player's/team's score. Also asks first.

---

## 4. Game guides

### 4.1 100 Questions

1. Choose **Beginner** or **Advanced** using the round toggle.
2. Click one of the 5 topic buttons.
3. Click **Draw question**. A random not-yet-used question from that topic and round appears with 4 options.
4. Read it aloud. Players buzz in; score with R (correct) or W (wrong).
   - Correct answers are worth **10 points** in Beginner, **20 points** in Advanced.
5. The progress grid shows how many questions are left per topic/round.

### 4.2 Category Board

1. Click a category plus dollar-value cell on the board ($10–$50 per category, 5 values each).
2. Read the question aloud. Players buzz in; score with R or W.
   - Correct answers are worth the cell's dollar value.
3. A wrong answer just locks that player out of that question. No points are deducted.
4. The board fills in as cells are played; **Reveal answer** shows it to everyone once nobody's getting it.

### 4.3 Bluffing Trivia

1. Click a topic button.
2. Click **Draw question**. A prompt with 4 options appears, only one of which is real (the other three are invented but plausible).
3. Read all four options aloud. Players buzz in and guess which one is real; score with R or W (10 points per correct guess).

### 4.4 Survey Showdown

1. Assign each named player to **Team A** or **Team B** (or "Off") using the dropdown next to their name.
2. Click **Draw next question**. A survey-style prompt appears.
3. **Face-off:** any assigned player buzzes in first to give their team control of the board.
4. The controlling team guesses answers; the host clicks a revealed answer on the board as it's named correctly, or clicks **Strike** for a miss.
5. **3 strikes** hands the other team one **steal** attempt at the whole pot. A correct guess wins them the pot; a miss (**Steal fails**) awards it to the original controlling team.
6. Whoever wins the round's pot has it added to their team score.

---

## 5. Troubleshooting

- **Contestant display won't open**: check your browser isn't blocking pop-ups for this page.
- **Background/icon upload says "PNG files only"**: the uploader is deliberately strict (JPGs don't support the transparency these need); convert the image to PNG first.
- **Background/icon upload says the file's too big**: it needs to be under 2 MB; compress or resize the image.
- **A renamed category doesn't show the right icon**: icons and labels are edited independently in Settings; upload a new icon for that slot or leave the default.
- **Scores/questions look wrong after a previous run**: use **Reset questions** and **Reset scores** before starting a new session.

## 6. Reworking this for your own event

These files are plain HTML, CSS, and JavaScript. No build process and no dependencies to install. Open one in any text editor to see how it works. The question banks, topic colors, and default icons are near the top of each file's `<script>` section if you want to swap in a new subject area entirely.

If you'd like help adapting these for a different topic, audience, or event format, reach out. Contact info is at the top of this document.

## License

Copyright (c) 2026 David Bouthot. The games, the question templates and this guide are released under the MIT License; see `LICENSE` in this folder. You can use, change and share them, as long as the copyright notice stays with them.

Each game file also includes SheetJS Community Edition 0.18.5, which reads and writes the question spreadsheets. SheetJS is (C) 2013-present SheetJS and stays under the Apache License 2.0; see `THIRD-PARTY-LICENSES.txt`.
