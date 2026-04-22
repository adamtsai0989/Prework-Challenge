# PRD: Two Truths One Lie — Team Building Web App

*Updated: 2026-04-21*

---

## Problem Statement

Teams, especially remote or newly formed ones, struggle to build genuine rapport during onboarding or team events. Existing icebreaker games are either too low-effort (name-a-fun-fact forms) or require expensive facilitation software. This app gives small teams (5–10 people) a structured, fun game they can run themselves — in a conference room, a video call, or anywhere in between — without needing accounts, subscriptions, or a reliable internet connection.

---

## Goals

1. A team of 5–10 people can start and complete a full game in under 30 minutes with zero setup friction (no accounts, no installs).
2. Every player gets a turn "on the stand" within a single session.
3. Players who correctly guess the lie are rewarded with points; players who successfully fool others are also rewarded — encouraging creative submissions.
4. The game works in both real-time (shared screen / video call) and offline (single device passed around the room) modes.
5. The leaderboard and results are shareable or printable at the end of the session.

---

## Non-Goals

1. **User accounts / persistent profiles** — No login, no saved history. Sessions are ephemeral.
2. **More than one game mode** — No variants like "two lies one truth" or custom rulesets in v1.
3. **Chat or voice** — Designed to run alongside an existing video call or in-person meeting.
4. **Mobile-native app** — Responsive web is sufficient; native iOS/Android packaging is not needed for v1.
5. **Spectator/observer roles** — Everyone in the room plays.

---

## User Stories

### Game Host

- As a host, I want to create a new game room and get a shareable join code so that my teammates can join without me sending them a URL.
- As a host, I want to control when each round advances (reveal phase, next player) so that the pace matches the room's energy.
- As a host, I want to see a final leaderboard at the end and be able to share or print it so that we can celebrate the winner.
- As a host, I want host privileges to automatically transfer to the next player if I disconnect so that the game is never permanently stuck.

### Player (Submitting)

- As the player on the stand, I want a private input screen to enter my two truths and one lie so that other players cannot see my submissions before guessing.
- As the player on the stand, I want to mark which of my three statements is the lie before submitting so that the app knows the correct answer without me having to remember.
- As the player on the stand, I want to reveal the answer myself (with a dramatic button press) so that I control the pacing and can add commentary.

### Player (Guessing)

- As a guessing player, I want to see all three statements clearly and tap/click the one I think is the lie so that my guess is recorded.
- As a guessing player, I want to see how many teammates have guessed (without seeing their choices) so that I know when everyone is ready.
- As a guessing player, I want to see an animated reveal and my score update immediately after the answer drops.

### Offline / Passed-Device Mode

- As a player in an offline setting, I want to take my turn on a single shared device with a private submission screen so that the game works without everyone having their own device.
- As a player in offline mode, I want the full game state preserved in local storage so that accidental page refreshes do not wipe the session.

### Developer / QA

- As a developer, I want to enable debug mode via a URL flag so that I can run a full game session alone without meeting the minimum player count.

---

## Requirements

### Must-Have (P0)

#### Room & Session Management

- Host creates a room; receives a 4–6 character join code.
- Join codes expire when the session ends (game completed or host closes the room). Expired codes return a "This session has ended" error.
- Players join by entering the code + a display name. No account required.
- Room supports 2–10 players. Game cannot start with fewer than 3 players in real-time mode (bypassed in debug mode).
- **Acceptance criteria:** A room is joinable from another device on the same network within 5 seconds of code entry. An expired code shows the appropriate error and prompts the user to start a new game.

#### Content Moderation (Work-Appropriate)

- All free-text fields (display name, statement inputs) are checked against a common profanity filter before submission.
- Validation runs client-side on input and server-side on receipt. Submissions that fail are rejected with an inline error; the player is prompted to revise.
- **Acceptance criteria:** Submissions containing common profanity are blocked with a visible inline error. Clean submissions are never incorrectly blocked.

#### Statement Submission

- Player on the stand sees a private form: three text inputs and a selector to mark which is the lie.
- Submission is locked after sending; no edits once guessing begins.
- **Acceptance criteria:** Other players cannot see statement content until reveal.

#### Guessing Phase

- Statements are displayed to guessers in a randomly shuffled order (not the order entered by the player on the stand).
- A live count shows "X of Y players have guessed" — no names, no choices revealed early.
- Host can force-advance if a player is unresponsive.
- **Acceptance criteria:** Guesses submitted after the reveal is triggered do not count toward scoring.

#### Reveal & Scoring

- Player on the stand (or host) triggers the reveal.
- Client-side CSS animation plays: statements animate in sequence, the lie is highlighted, correct/incorrect shown per player. Animation completes within 2 seconds on a mid-range device.
- Scoring rules:
  - +2 points to each guesser who correctly identified the lie
  - +1 point to the player on the stand per guesser who guessed wrong
- Leaderboard updates immediately after each round.
- **Acceptance criteria:** Scores are deterministic and match the rules above with no rounding or race-condition errors.

#### Host Disconnect & Auto-Promotion (Real-Time Mode)

- A player is considered disconnected after **45 seconds** of inactivity (no WebSocket heartbeat received).
- On host disconnect, the server immediately promotes the next player in join order to host.
- All players receive a toast notification: "[Name] is now the host."
- The promoted host inherits all host controls (advance round, force-reveal, end game).
- If the disconnected host was the player on the stand, the promoted host may trigger the reveal.
- **Acceptance criteria:** Promotion occurs within 5 seconds of the 45-second inactivity timeout firing. Game state is fully preserved during the transition.

#### Round Progression

- Game cycles through all players as the "player on the stand" once.
- After all players have gone, the session ends, the join code expires, and the final leaderboard is shown.
- Host can end the game early (also expires the join code).

#### Offline / Single-Device Mode

- Selectable at game creation: "Everyone has a device" (real-time) vs. "Passing one device" (offline).
- In offline mode, all state is persisted exclusively to `localStorage`. No network calls are made after game creation.
- A "Pass to [Name]" interstitial screen is shown before each player's private submission or guessing turn, preventing the previous player's data from being visible.
- Page refresh restores the session from `localStorage` without data loss.
- **Acceptance criteria:** A full 5-player game completes with no network connection. A mid-game page refresh restores the correct game state.

#### Debug / Test Mode

- Activated via URL flag: `?debug=true`. Not accessible through any UI element.
- In debug mode: the 3-player minimum for real-time mode is removed; a single user can start and run a full session.
- A persistent banner or badge is shown throughout the session so debug mode is never confused with a real game.
- Debug mode only bypasses the player count gate — all other game logic, scoring, and content filtering behaves identically.
- **Acceptance criteria:** With `?debug=true`, a host can start a real-time game with 1 player. The debug banner is visible on every screen for the duration of the session.

---

### Nice-to-Have (P1)

- **Timer per round** — Optional countdown for submission and guessing phases (host-configurable: 30s / 60s / off).
- **Emoji reactions** — Players can send a quick reaction (😂 🤯 😮) during the reveal, visible to all.
- **Round recap screen** — After each round, show who guessed what and who was fooled before advancing.
- **Configurable points** — Host can adjust point values before the game starts.
- **Share / print leaderboard** — Export final results as an image or printable view.

---

### Future Considerations (P2)

- **Session history / export** — Save results to JSON/CSV for team retrospectives.
- **Persistent player profiles** — Carry scores across multiple sessions.
- **Custom themes / branding** — Company logo, color scheme for the game room.
- **Spectator mode** — Read-only view for latecomers or facilitators.
- **Async mode** — Players submit on their own time; guessing opens after all submissions are in.

---

## Success Metrics

### Leading Indicators (1–2 weeks post-launch)

| Metric | Target |
|---|---|
| Game completion rate | ≥ 80% of started games reach the final leaderboard |
| Average session duration | 15–25 minutes for a 5-player game |
| Error / crash rate | < 1% of rounds encounter a blocking error |
| Content filter false-positive rate | < 2% of clean submissions incorrectly blocked |
| Host disconnect recovery | 100% of disconnects result in successful promotion with no stuck sessions |

### Lagging Indicators (1–2 months)

| Metric | Target |
|---|---|
| Repeat sessions (same host, 2+ games) | ≥ 30% of hosts return within 30 days |
| Offline mode adoption | Baseline established; tracked as % of all sessions |
| Net Promoter Score (optional post-game prompt) | ≥ 40 |

---

## Resolved Decisions

| # | Decision |
|---|---|
| Offline state management | `localStorage` only. Offline and real-time are separate modes chosen at game creation. No sync on reconnect. |
| Join code expiry | Codes expire when the session ends. Expired codes return "This session has ended." |
| Host auto-promotion | Server promotes the next player in join order within 5 seconds of disconnect detection. Toast notification sent to all players. |
| Content moderation | Common profanity filter only, applied client-side and server-side on all free-text inputs. |
| Reveal animation | Client-side CSS only. Server sends the reveal signal; client owns all animation logic. |
| Debug / test mode | URL flag (`?debug=true`) only — no UI toggle. Bypasses player count minimum. Persistent debug banner shown throughout the session. |
| Inactivity timeout | 45 seconds without a WebSocket heartbeat triggers disconnect handling. |

---

## Open Questions

None — all questions resolved. Spec is ready for engineering handoff.

---

## Timeline Considerations

- **No hard deadline specified.** Recommended phasing:
  - **Phase 1 (MVP):** All P0 requirements — real-time mode, offline/passed-device mode, content moderation, host auto-promotion, debug mode.
  - **Phase 2:** P1 polish (timer, emoji reactions, round recap, leaderboard export) based on playtesting feedback.
- **Key dependency:** WebSocket support on the Express.js backend is required for real-time mode. Confirm hosting environment supports persistent connections before committing to a deployment target. Offline mode has no such constraint.
