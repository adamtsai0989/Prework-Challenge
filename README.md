# Two Truths One Lie

A real-time team building web application based on the classic icebreaker game. Players take turns on the "stand," submitting two truths and one lie about themselves while teammates try to guess which statement is the lie. Points are awarded for correct guesses — and for successfully fooling others.

---

## Background

Two Truths One Lie is designed for small teams of 5–10 people looking for a quick, low-friction icebreaker during onboarding sessions, team events, or virtual meetings. No accounts, no downloads, and no prior setup required — just create a room and share the code.

The app supports two modes:
- **Real-time mode** — each player joins on their own device, ideal for remote or hybrid teams on a video call.
- **Offline mode** — a single shared device is passed around the room, ideal for in-person teams without individual devices.

---

## Technologies

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| React Router DOM | 7 | Client-side routing |
| Socket.io Client | 4 | Real-time WebSocket communication |
| leo-profanity | 1.9 | Client-side content filtering |
| Vite | 8 | Development server and build tool |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 5 | HTTP server and REST API |
| Socket.io | 4 | WebSocket server for real-time events |
| leo-profanity | 1.9 | Server-side content filtering |
| nodemon | 3 | Auto-restart during development |

---

## Features

### Gameplay
- **Two Truths One Lie** — each player submits two truths and one lie; others guess which is the lie
- **Scoring** — +2 points for correctly identifying the lie; +1 point to the player on the stand per person they fool
- **Statement shuffle** — statements are displayed in a randomised order to prevent positional tells
- **Reveal animation** — CSS-animated card reveal with a shake effect on the lie and colour-coded truth/lie badges

### Real-Time Mode
- Players join via a 5-character room code on their own device
- Live guess progress bar updates as each player locks in their answer
- Host controls: start game, force-advance the guessing phase, advance rounds, end game early
- Automatic host promotion if the host disconnects — the next player in join order takes over within 5 seconds
- 45-second inactivity timeout with heartbeat detection

### Offline Mode
- Single-device gameplay — no internet connection required after the room is created
- Host adds all players by name in the lobby before the game starts; players can be removed before starting
- Pass-device interstitial screen between each turn so players cannot see each other's inputs
- Full game state persisted to `localStorage` — page refreshes do not wipe the session

### Room Management
- Join codes expire automatically when the game ends or the host closes the room
- Rooms are cleaned from memory one hour after expiry
- Rooms support 2–10 players

### Content Moderation
- Common profanity filter applied to all free-text inputs (player names and statements)
- Validation runs on both the client (immediate inline feedback) and server (enforcement)

### Debug / Test Mode
- Append `?debug=true` to the URL to bypass the 3-player minimum
- A persistent banner is shown throughout the session to distinguish it from a real game
- All game logic, scoring, and filtering behave identically in debug mode

---

## Project Structure

```
preworkproject/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── end/         # FinalLeaderboard
│   │   │   ├── game/        # GameHeader, GuessProgressBar, MiniLeaderboard,
│   │   │   │   │              PassDeviceInterstitial
│   │   │   │   ├── phases/  # SubmissionPhase, WaitingPhase, GuessingPhase, RevealPhase
│   │   │   │   └── reveal/  # StatementRevealCard
│   │   │   ├── layout/      # DebugBanner, Toast
│   │   │   └── lobby/       # PlayerList
│   │   ├── context/         # GameContext (state), SocketContext (real-time sync)
│   │   ├── hooks/           # useDebugMode, useLocalStorage
│   │   ├── pages/           # HomePage, LobbyPage, GamePage, EndPage
│   │   └── utils/           # shuffle, profanityFilter
│   └── package.json
├── server/                  # Express backend
│   ├── src/
│   │   ├── index.js         # Server entry point
│   │   ├── routes.js        # REST API
│   │   ├── socketHandler.js # WebSocket game logic
│   │   ├── roomStore.js     # In-memory room storage
│   │   ├── utils.js         # Scoring, shuffle, leaderboard
│   │   └── profanity.js     # Content filter
│   └── package.json
├── PRD.md                   # Product requirements document
├── REACT_COMPONENT_MAP.md   # Frontend architecture reference
├── API_DESIGN.md            # API and WebSocket design reference
└── README.md
```

---

## Installation

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher

### 1. Clone the repository

```bash
git clone <repository-url>
cd preworkproject
```

### 2. Install server dependencies

```bash
cd server
npm install
```

### 3. Install client dependencies

```bash
cd ../client
npm install
```

---

## Running the App

Both the server and client need to be running at the same time. Open two terminal windows.

### Terminal 1 — Start the server

```bash
cd server
npm run dev
```

The server starts on `http://localhost:3001`

### Terminal 2 — Start the client

```bash
cd client
npm run dev
```

The client starts on `http://localhost:5173`

Open `http://localhost:5173` in your browser to use the app.

---

## Available Scripts

### Server (`/server`)

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start the server with nodemon (auto-restarts on file changes) |
| `start` | `npm start` | Start the server without nodemon (production use) |

### Client (`/client`)

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start the Vite development server with hot module replacement |
| `build` | `npm run build` | Build the app for production into `client/dist/` |
| `preview` | `npm run preview` | Serve the production build locally for testing |
| `lint` | `npm run lint` | Run ESLint across all source files |

---

## How to Play

### Real-Time Mode (each player has a device)

1. One player opens the app and clicks **Create Game**, enters their name, selects **Everyone has a device**, and clicks **Create Room**.
2. The room code is shared with teammates. Each teammate opens the app, clicks **Join Game**, enters their name and the room code.
3. Once everyone has joined, the host clicks **Start Game**.
4. The player on the stand submits two truths and one lie, marking which statement is the lie.
5. All other players see the three statements (in shuffled order) and tap the one they think is the lie.
6. Once everyone has guessed, the player on the stand clicks **Reveal the Lie**.
7. Points are awarded, scores update, and the host advances to the next round.
8. After all players have taken a turn on the stand, the final leaderboard is shown.

### Offline Mode (one shared device)

1. One player opens the app, clicks **Create Game**, enters their name, selects **Passing one device**, and clicks **Create Room**.
2. In the lobby, enter the name of each additional player using the **Add** field and click **Add**. Players can be removed with the ✕ button.
3. Click **Start Game**. The device will prompt you to pass it to each player in turn.
4. Gameplay follows the same structure — each player submits their statements privately, then the device is passed to each guesser one by one.
5. After all guesses are in, the **Reveal** button appears. The final leaderboard shows after the last round.

### Debug / Test Mode

Append `?debug=true` to the URL to start a game without the 3-player minimum:

```
http://localhost:5173?debug=true
```

A yellow banner will be shown throughout the session.
