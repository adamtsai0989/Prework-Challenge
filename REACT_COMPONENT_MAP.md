# React Component Map: Two Truths One Lie

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 |
| Routing | React Router v6 |
| State (global) | React Context + `useReducer` |
| State (server sync) | Socket.io-client |
| State (offline) | `localStorage` via custom hook |
| Styling | CSS Modules |
| Animations | CSS keyframes (client-side reveal) |

---

## Route Structure

| Path | Page Component | Description |
|---|---|---|
| `/` | `HomePage` | Create or join a game |
| `/lobby/:code` | `LobbyPage` | Waiting room before game starts |
| `/game/:code` | `GamePage` | Active game (all phases) |
| `/end/:code` | `EndPage` | Final leaderboard |

---

## Component Hierarchy

```
App
├── DebugBanner                      # Shown only when ?debug=true
├── ToastNotification                # Global toast (host changes, errors)
└── Router
    ├── HomePage
    │   ├── CreateRoomForm           # Mode selector + create button
    │   └── JoinRoomForm
    │       └── JoinCodeInput        # Masked 4–6 char input with validation
    │
    ├── LobbyPage
    │   ├── JoinCodeDisplay          # Shows room code for sharing
    │   ├── PlayerList
    │   │   └── PlayerListItem       # Name + host crown indicator
    │   └── HostControls             # Start game button (host only)
    │
    ├── GamePage                     # Renders active phase component
    │   ├── GameHeader               # Round counter + "on the stand" label
    │   ├── MiniLeaderboard          # Compact scores, visible between phases
    │   │   └── LeaderboardRow
    │   ├── SubmissionPhase          # Shown to player on the stand
    │   │   └── StatementForm
    │   │       ├── StatementInput   # Text input ×3
    │   │       └── LieSelector      # Radio — marks which statement is the lie
    │   ├── WaitingPhase             # Player on the stand waits after submitting
    │   │   └── GuessProgressBar     # "X of Y players have guessed"
    │   ├── GuessingPhase            # Shown to all other players
    │   │   ├── StatementCard        # Clickable card ×3 (shuffled order)
    │   │   └── GuessProgressBar
    │   ├── RevealPhase              # Triggered by player on stand / host
    │   │   ├── StatementRevealCard  # ×3, CSS animation sequence
    │   │   └── ScoreDelta           # +N points popup per player
    │   └── HostControls             # Force-advance, trigger reveal, end game
    │
    ├── PassDeviceInterstitial       # Offline mode only — between each turn
    │
    └── EndPage
        ├── FinalLeaderboard
        │   └── LeaderboardRow       # Rank, name, score, highlight winner
        └── NewGameButton            # Returns to HomePage
```

---

## Context & Hooks

### `GameContext`
Global game state. Consumed by all game-phase components.

```ts
type GameState = {
  mode: 'realtime' | 'offline';
  roomCode: string;
  players: Player[];
  localPlayerId: string;
  isHost: boolean;
  currentRound: number;
  totalRounds: number;
  playerOnStand: string;           // playerId
  phase: 'submitting' | 'guessing' | 'reveal' | 'complete';
  statements: ShuffledStatement[]; // populated after submission
  guessCount: number;
  myGuess: number | null;          // statementIndex
  scores: Score[];
  debugMode: boolean;
};
```

Reducer actions:
- `SET_PHASE`
- `UPDATE_PLAYERS`
- `SET_STATEMENTS`
- `UPDATE_GUESS_COUNT`
- `SET_MY_GUESS`
- `UPDATE_SCORES`
- `PROMOTE_HOST`
- `NEXT_ROUND`
- `END_GAME`

### `SocketContext`
Wraps the Socket.io client. Provides `socket`, `connected` flag, and `emit` helper. Only active in real-time mode — `null` in offline mode.

### `useLocalStorage(key, initialValue)`
Read/write game state to `localStorage`. Used exclusively by offline mode. Serializes/deserializes `GameState` on every state change.

### `useDebugMode()`
Reads `?debug=true` from `window.location.search`. Returns a boolean. Used in `App` to set `debugMode` in initial state and render `DebugBanner`.

### `useProfanityFilter()`
Wraps the client-side profanity filter library. Returns a `validate(text): { valid: boolean, message?: string }` function. Used in `StatementForm` and `JoinRoomForm`.

---

## Component Details

### `StatementRevealCard`
The core animation component. Receives `{ text, isLie, myGuess, revealDelay }`.

Animation sequence (CSS keyframes, staggered by `revealDelay`):
1. Card flips face-up (0–300ms)
2. Pause (300–600ms)
3. If `isLie`: highlight red, shake animation
4. If correct guess: green border pulse
5. If wrong guess: grey fade

### `PassDeviceInterstitial` (offline mode only)
Full-screen overlay with player name and instruction. Shown:
- Before `SubmissionPhase` for the current player on the stand
- Before each player's turn in `GuessingPhase`

Requires a deliberate "I'm ready" tap to dismiss, preventing accidental skips.

### `DebugBanner`
Fixed position banner (top of screen). Shown for the entire session when `debugMode === true`. Non-dismissible.

### `HostControls`
Conditionally rendered — only visible to the current host. Buttons vary by phase:

| Phase | Controls |
|---|---|
| Lobby | Start Game |
| Submitting | (none — wait for player on stand) |
| Guessing | Force Advance |
| Reveal | Next Round / End Game |

### `GuessProgressBar`
Displays "X of Y players have guessed." Updates in real-time via socket event in real-time mode, or by local count in offline mode. Does not reveal who guessed or what.

---

## Game Phase Flow

```
Lobby
  └─► [Host starts game]
        └─► SubmissionPhase (player on stand)
              └─► [Player submits]
                    └─► GuessingPhase (all other players)
                    └─► WaitingPhase (player on stand)
                          └─► [All guessed OR host force-advances]
                                └─► RevealPhase
                                      └─► [Host / player on stand reveals]
                                            └─► Score update + MiniLeaderboard
                                                  └─► [More players?]
                                                        ├─► Yes → SubmissionPhase (next player)
                                                        └─► No  → EndPage
```

---

## Offline Mode Differences

| Behavior | Real-Time Mode | Offline Mode |
|---|---|---|
| State source | `GameContext` synced via Socket.io | `GameContext` persisted to `localStorage` |
| Network calls | WebSocket + REST | None after game creation |
| Phase transitions | Driven by server events | Driven by local user actions |
| Multi-device | Yes | No — single device |
| `PassDeviceInterstitial` | Not shown | Shown between every turn |
| Host controls | Sent as socket events | Applied directly to local state |

---

## File Structure

```
src/
├── App.tsx
├── main.tsx
├── context/
│   ├── GameContext.tsx
│   └── SocketContext.tsx
├── hooks/
│   ├── useLocalStorage.ts
│   ├── useDebugMode.ts
│   └── useProfanityFilter.ts
├── pages/
│   ├── HomePage.tsx
│   ├── LobbyPage.tsx
│   ├── GamePage.tsx
│   └── EndPage.tsx
├── components/
│   ├── layout/
│   │   ├── DebugBanner.tsx
│   │   └── ToastNotification.tsx
│   ├── lobby/
│   │   ├── CreateRoomForm.tsx
│   │   ├── JoinRoomForm.tsx
│   │   ├── JoinCodeInput.tsx
│   │   ├── JoinCodeDisplay.tsx
│   │   ├── PlayerList.tsx
│   │   └── PlayerListItem.tsx
│   ├── game/
│   │   ├── GameHeader.tsx
│   │   ├── MiniLeaderboard.tsx
│   │   ├── LeaderboardRow.tsx
│   │   ├── HostControls.tsx
│   │   ├── GuessProgressBar.tsx
│   │   ├── PassDeviceInterstitial.tsx
│   │   ├── phases/
│   │   │   ├── SubmissionPhase.tsx
│   │   │   ├── WaitingPhase.tsx
│   │   │   ├── GuessingPhase.tsx
│   │   │   └── RevealPhase.tsx
│   │   └── reveal/
│   │       ├── StatementRevealCard.tsx
│   │       └── ScoreDelta.tsx
│   └── end/
│       ├── FinalLeaderboard.tsx
│       └── NewGameButton.tsx
├── types/
│   └── index.ts                   # Shared TypeScript types
└── utils/
    ├── profanityFilter.ts
    └── shuffle.ts                 # Fisher-Yates for statement ordering
```
