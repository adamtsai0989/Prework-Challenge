# API & WebSocket Design: Two Truths One Lie

---

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Real-time | Socket.io |
| Session store | In-memory (Map) — no database for v1 |
| Profanity filter | Server-side validation on all text inputs |

---

## Data Models

### Room

```ts
type Room = {
  code: string;                  // 4–6 char alphanumeric, uppercase
  hostId: string;                // playerId of current host
  players: Player[];
  playerOrder: string[];         // playerIds in join order — used for auto-promotion
  status: 'lobby' | 'playing' | 'ended';
  mode: 'realtime' | 'offline';  // set at creation, immutable
  rounds: Round[];
  currentRoundIndex: number;
  createdAt: number;             // Unix timestamp
  expiresAt: number | null;      // Set when session ends
};
```

### Player

```ts
type Player = {
  id: string;                    // UUID, generated server-side on join
  name: string;
  score: number;
  joinOrder: number;             // 0-based, used for host promotion
  connected: boolean;
  lastHeartbeat: number;         // Unix timestamp
  socketId: string;
};
```

### Round

```ts
type Round = {
  roundNumber: number;           // 1-based
  playerOnStandId: string;
  statements: Statement[];       // In submission order (server stores original order)
  shuffledOrder: number[];       // Indices in shuffled order, sent to guessers
  guesses: Record<string, number>; // { [playerId]: statementIndex (shuffled) }
  status: 'submitting' | 'guessing' | 'revealed' | 'complete';
};
```

### Statement

```ts
type Statement = {
  text: string;
  isLie: boolean;
};
```

### Score Delta (emitted after reveal)

```ts
type ScoreDelta = {
  playerId: string;
  name: string;
  previousScore: number;
  delta: number;
  newScore: number;
  guessedCorrectly: boolean | null; // null for player on the stand
};
```

---

## REST Endpoints

### `POST /api/rooms`

Create a new game room.

**Request body:**
```json
{
  "hostName": "Alice",
  "mode": "realtime"
}
```

**Response `201`:**
```json
{
  "roomCode": "KFGT2",
  "playerId": "uuid-...",
  "playerToken": "jwt-or-opaque-token"
}
```

**Errors:**
| Code | Condition |
|---|---|
| `400` | Missing or invalid fields, profanity in name |
| `422` | Invalid mode value |

---

### `POST /api/rooms/:code/join`

Join an existing room.

**Request body:**
```json
{
  "name": "Bob"
}
```

**Response `200`:**
```json
{
  "playerId": "uuid-...",
  "playerToken": "jwt-or-opaque-token",
  "room": {
    "code": "KFGT2",
    "hostId": "uuid-alice",
    "players": [
      { "id": "uuid-alice", "name": "Alice", "score": 0 }
    ],
    "status": "lobby",
    "mode": "realtime"
  }
}
```

**Errors:**
| Code | Condition |
|---|---|
| `400` | Missing name, profanity in name |
| `404` | Room code not found or expired |
| `409` | Room is full (10 players) or game already started |

---

### `DELETE /api/rooms/:code`

Host closes the room early. Expires the join code immediately.

**Headers:** `Authorization: Bearer <playerToken>`

**Response `204`:** No content.

**Errors:**
| Code | Condition |
|---|---|
| `403` | Requester is not the host |
| `404` | Room not found |

---

## WebSocket Events

All Socket.io events use the same room as a channel (`socket.join(roomCode)`). The server validates `playerToken` on connection via handshake auth.

### Connection

```js
// Client connects with token in handshake
const socket = io(SERVER_URL, {
  auth: { token: playerToken }
});
```

On successful connection the server emits `room_updated` to all players in the room.

---

### Client → Server Events

#### `heartbeat`
Sent by the client every **15 seconds** to reset the 45-second inactivity timer.

```ts
// No payload
socket.emit('heartbeat');
```

---

#### `start_game`
Host only. Transitions room from `lobby` to `playing`.

```ts
socket.emit('start_game');
```

**Server validates:** sender is host, player count ≥ 3 (or debug mode active), status is `lobby`.

---

#### `submit_statements`
Player on the stand only. Submits the three statements.

```ts
socket.emit('submit_statements', {
  statements: [
    { text: "I once ate an entire pizza alone", isLie: false },
    { text: "I have visited 12 countries",      isLie: false },
    { text: "I can speak four languages",       isLie: true  }
  ]
});
```

**Server validates:** sender is player on the stand, phase is `submitting`, text passes profanity filter, exactly one `isLie: true`.

---

#### `submit_guess`
Guessing player only. Submits which statement (by shuffled index) they think is the lie.

```ts
socket.emit('submit_guess', {
  statementIndex: 2  // index in the shuffled order shown to guessers
});
```

**Server validates:** sender is not the player on the stand, phase is `guessing`, player has not already guessed.

---

#### `trigger_reveal`
Player on the stand or host. Moves phase from `guessing` → `revealed`.

```ts
socket.emit('trigger_reveal');
```

**Server validates:** sender is player on the stand or host, phase is `guessing`.

---

#### `advance_round`
Host only. Moves to the next round after reveal is complete.

```ts
socket.emit('advance_round');
```

**Server validates:** sender is host, phase is `revealed`.

---

#### `force_advance`
Host only. Skips a player who has not guessed and advances the phase.

```ts
socket.emit('force_advance');
```

**Server validates:** sender is host, phase is `guessing`.

---

#### `end_game`
Host only. Ends the game early. Expires the join code.

```ts
socket.emit('end_game');
```

---

### Server → Client Events

#### `room_updated`
Emitted to all players whenever the player list changes (join, leave, reconnect).

```ts
{
  players: [
    { id: string, name: string, score: number, connected: boolean }
  ],
  hostId: string
}
```

---

#### `game_started`
Emitted to all players when the host starts the game.

```ts
{
  playerOrder: string[],  // playerIds in turn order
  firstPlayerOnStand: {
    id: string,
    name: string
  },
  roundNumber: 1,
  totalRounds: number     // equals playerCount
}
```

---

#### `round_started`
Emitted at the start of each round.

```ts
{
  roundNumber: number,
  playerOnStand: {
    id: string,
    name: string
  }
}
```

---

#### `player_submitted`
Emitted to all guessing players when the player on the stand submits. Content is not included — only a notification that they can now guess.

```ts
{
  playerOnStand: {
    id: string,
    name: string
  },
  statements: [
    { text: string },  // isLie intentionally omitted
    { text: string },
    { text: string }
  ]
  // statements are in shuffledOrder — server shuffles before sending
}
```

---

#### `guess_count_updated`
Emitted to all players each time a guess is submitted.

```ts
{
  guessed: number,   // number of players who have guessed
  total: number      // total number of guessing players
}
```

---

#### `reveal`
Emitted to all players when reveal is triggered.

```ts
{
  statements: [
    { text: string, isLie: boolean },  // in shuffled order
    { text: string, isLie: boolean },
    { text: string, isLie: boolean }
  ],
  correctIndex: number,  // shuffled index of the lie
  guesses: [
    { playerId: string, name: string, guessedIndex: number, correct: boolean }
  ]
}
```

---

#### `scores_updated`
Emitted immediately after `reveal`, once scores have been calculated.

```ts
{
  deltas: [
    {
      playerId: string,
      name: string,
      previousScore: number,
      delta: number,
      newScore: number,
      guessedCorrectly: boolean | null  // null for player on the stand
    }
  ],
  leaderboard: [
    { rank: number, playerId: string, name: string, score: number }
  ]
}
```

---

#### `round_complete`
Emitted after scores are updated. Signals clients to show post-round state.

```ts
{
  roundNumber: number,
  isLastRound: boolean
}
```

---

#### `game_ended`
Emitted when the final round completes or host ends early. Join code is expired server-side.

```ts
{
  reason: 'completed' | 'host_ended',
  finalLeaderboard: [
    { rank: number, playerId: string, name: string, score: number }
  ]
}
```

---

#### `host_changed`
Emitted to all players when the host is auto-promoted due to disconnect.

```ts
{
  previousHostId: string,
  newHostId: string,
  newHostName: string,
  reason: 'disconnected'
}
```

---

#### `error`
Emitted to the originating client when a server-side validation fails.

```ts
{
  code: 'PROFANITY' | 'NOT_HOST' | 'WRONG_PHASE' | 'ALREADY_GUESSED' | 'ROOM_FULL' | 'ROOM_EXPIRED' | 'INVALID_SUBMISSION',
  message: string  // human-readable, safe to display in UI
}
```

---

## Server-Side Logic Notes

### Heartbeat & Disconnect Handling

```
Every 5 seconds, server scans all connected players:
  if (now - player.lastHeartbeat > 45_000ms):
    mark player as disconnected
    if player is host:
      promote next player in playerOrder with connected === true
      emit host_changed to room
```

On Socket.io `disconnect` event, player is also immediately marked disconnected and the same promotion logic runs.

### Room Code Generation

- 5-character alphanumeric (A-Z, 0-9), uppercase, excluding ambiguous chars (0/O, 1/I/L).
- Check for collisions against active rooms before issuing.
- Expiry: set `expiresAt = Date.now()` when game ends. Expired rooms are cleaned from memory after 1 hour.

### Shuffle

Statements are shuffled server-side using Fisher-Yates before being sent in `player_submitted`. The server stores the mapping between shuffled indices and original indices to correctly score guesses.

### Scoring

```
After reveal:
  For each guessing player p:
    if p.guess maps to the lie statement:
      p.score += 2
    else:
      playerOnStand.score += 1
```

Scoring is calculated server-side only. Client receives final values via `scores_updated`.

### Profanity Filter

Applied server-side on:
- `POST /api/rooms` → `hostName`
- `POST /api/rooms/:code/join` → `name`
- `submit_statements` → each statement `text`

If validation fails, a `PROFANITY` error event is emitted and the submission is rejected. The room state does not change.

---

## Sequence Diagrams

### Happy Path: Single Round (Real-Time)

```
Host          Server          Players
 |                |               |
 |--start_game--->|               |
 |                |--game_started→|
 |                |--round_started→|
 |                |               |
PlayerOnStand                  Guessers
 |--submit_statements→|           |
 |                |--player_submitted→|
 |                |               |--submit_guess→|
 |                |--guess_count_updated→(all)
 |                |               |--submit_guess→|
 |                |--guess_count_updated→(all)
 |--trigger_reveal→|              |
 |                |--reveal→(all) |
 |                |--scores_updated→(all)
 |                |--round_complete→(all)
Host
 |--advance_round→|
 |                |--round_started→(all)
 |                |      ...
```

### Host Disconnect Mid-Game

```
Host          Server          Next Player (new host)    Others
 |                |                    |                   |
 |  [disconnects] |                    |                   |
 |                | [45s timeout]      |                   |
 |                |--host_changed----->|                   |
 |                |--host_changed------------------------->|
 |                |                    |                   |
 |                |       [new host now has controls]      |
```
