const { getRoom, expireRoom } = require('./roomStore');
const { isClean } = require('./profanity');
const { buildLeaderboard, calculateScores, promoteNextHost, shuffleStatements } = require('./utils');

const HEARTBEAT_TIMEOUT = 45_000;
const DISCONNECT_CHECK_INTERVAL = 5_000;

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing token'));
    socket.playerId = token;
    next();
  });

  io.on('connection', (socket) => {
    const playerId = socket.playerId;
    let currentRoomCode = null;

    function getPlayerRoom() {
      return currentRoomCode ? getRoom(currentRoomCode) : null;
    }

    function emitError(code, message) {
      socket.emit('error', { code, message });
    }

    socket.on('join_room', ({ roomCode }) => {
      const room = getRoom(roomCode.toUpperCase());
      if (!room) return emitError('ROOM_EXPIRED', 'This session has ended.');

      const player = room.players.find(p => p.id === playerId);
      if (!player) return emitError('NOT_FOUND', 'Player not found in room.');

      currentRoomCode = room.code;
      player.connected = true;
      player.lastHeartbeat = Date.now();
      player.socketId = socket.id;
      socket.join(room.code);

      io.to(room.code).emit('room_updated', {
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, connected: p.connected })),
        hostId: room.hostId,
      });
    });

    socket.on('heartbeat', () => {
      const room = getPlayerRoom();
      if (!room) return;
      const player = room.players.find(p => p.id === playerId);
      if (player) player.lastHeartbeat = Date.now();
    });

    socket.on('start_game', ({ debug } = {}) => {
      const room = getPlayerRoom();
      if (!room) return;
      if (room.hostId !== playerId) return emitError('NOT_HOST', 'Only the host can start the game.');
      if (room.status !== 'lobby') return emitError('WRONG_PHASE', 'Game already started.');

      const minPlayers = debug ? 1 : 3;
      const connected = room.players.filter(p => p.connected);
      if (connected.length < minPlayers) {
        return emitError('NOT_ENOUGH_PLAYERS', `Need at least ${minPlayers} players.`);
      }

      room.status = 'playing';
      room.currentRoundIndex = 0;

      const round = {
        roundNumber: 1,
        playerOnStandId: room.playerOrder[0],
        statements: [],
        shuffledOrder: [],
        guesses: {},
        phase: 'submitting',
      };
      room.rounds.push(round);

      io.to(room.code).emit('game_started', {
        playerOrder: room.playerOrder,
        firstPlayerOnStand: {
          id: room.playerOrder[0],
          name: room.players.find(p => p.id === room.playerOrder[0])?.name,
        },
        roundNumber: 1,
        totalRounds: room.players.length,
      });

      io.to(room.code).emit('round_started', {
        roundNumber: 1,
        playerOnStand: {
          id: round.playerOnStandId,
          name: room.players.find(p => p.id === round.playerOnStandId)?.name,
        },
      });
    });

    socket.on('submit_statements', ({ statements }) => {
      const room = getPlayerRoom();
      if (!room) return;
      const round = room.rounds[room.currentRoundIndex];
      if (!round) return;
      if (round.playerOnStandId !== playerId) return emitError('WRONG_PHASE', 'It is not your turn.');
      if (round.phase !== 'submitting') return emitError('WRONG_PHASE', 'Submission phase is over.');
      if (!Array.isArray(statements) || statements.length !== 3) {
        return emitError('INVALID_SUBMISSION', 'Must submit exactly 3 statements.');
      }
      if (statements.filter(s => s.isLie).length !== 1) {
        return emitError('INVALID_SUBMISSION', 'Exactly one statement must be marked as the lie.');
      }
      for (const s of statements) {
        if (!isClean(s.text)) return emitError('PROFANITY', 'Please revise your statements.');
      }

      round.statements = statements;
      round.shuffledOrder = shuffleStatements();
      round.phase = 'guessing';

      const shuffled = round.shuffledOrder.map(i => ({ text: statements[i].text }));
      io.to(room.code).emit('player_submitted', {
        playerOnStand: {
          id: playerId,
          name: room.players.find(p => p.id === playerId)?.name,
        },
        statements: shuffled,
      });
    });

    socket.on('submit_guess', ({ statementIndex }) => {
      const room = getPlayerRoom();
      if (!room) return;
      const round = room.rounds[room.currentRoundIndex];
      if (!round) return;
      if (round.phase !== 'guessing') return emitError('WRONG_PHASE', 'Guessing phase is not active.');
      if (round.playerOnStandId === playerId) return emitError('WRONG_PHASE', 'You cannot guess your own statements.');
      if (round.guesses[playerId] !== undefined) return emitError('ALREADY_GUESSED', 'You have already guessed.');

      round.guesses[playerId] = statementIndex;

      const guessers = room.players.filter(p => p.id !== round.playerOnStandId && p.connected);
      io.to(room.code).emit('guess_count_updated', {
        guessed: Object.keys(round.guesses).length,
        total: guessers.length,
      });
    });

    socket.on('trigger_reveal', () => {
      const room = getPlayerRoom();
      if (!room) return;
      const round = room.rounds[room.currentRoundIndex];
      if (!round) return;
      if (round.phase !== 'guessing') return emitError('WRONG_PHASE', 'Not in guessing phase.');
      if (playerId !== round.playerOnStandId && playerId !== room.hostId) {
        return emitError('NOT_HOST', 'Only the player on the stand or host can reveal.');
      }

      round.phase = 'revealed';

      const correctOriginalIndex = round.statements.findIndex(s => s.isLie);
      const correctShuffledIndex = round.shuffledOrder.indexOf(correctOriginalIndex);

      const guessDetails = room.players
        .filter(p => p.id !== round.playerOnStandId)
        .map(p => ({
          playerId: p.id,
          name: p.name,
          guessedIndex: round.guesses[p.id] ?? null,
          correct: round.guesses[p.id] === correctShuffledIndex,
        }));

      io.to(room.code).emit('reveal', {
        statements: round.shuffledOrder.map(i => ({
          text: round.statements[i].text,
          isLie: round.statements[i].isLie,
        })),
        correctIndex: correctShuffledIndex,
        guesses: guessDetails,
      });

      const deltas = calculateScores(room);
      io.to(room.code).emit('scores_updated', {
        deltas,
        leaderboard: buildLeaderboard(room.players),
      });

      const isLastRound = room.currentRoundIndex >= room.players.length - 1;
      io.to(room.code).emit('round_complete', {
        roundNumber: round.roundNumber,
        isLastRound,
      });
    });

    socket.on('advance_round', () => {
      const room = getPlayerRoom();
      if (!room) return;
      if (room.hostId !== playerId) return emitError('NOT_HOST', 'Only the host can advance.');
      const round = room.rounds[room.currentRoundIndex];
      if (!round || round.phase !== 'revealed') return emitError('WRONG_PHASE', 'Cannot advance yet.');

      round.phase = 'complete';
      room.currentRoundIndex++;

      if (room.currentRoundIndex >= room.playerOrder.length) {
        expireRoom(room.code);
        io.to(room.code).emit('game_ended', {
          reason: 'completed',
          finalLeaderboard: buildLeaderboard(room.players),
        });
        return;
      }

      const nextRound = {
        roundNumber: room.currentRoundIndex + 1,
        playerOnStandId: room.playerOrder[room.currentRoundIndex],
        statements: [],
        shuffledOrder: [],
        guesses: {},
        phase: 'submitting',
      };
      room.rounds.push(nextRound);

      io.to(room.code).emit('round_started', {
        roundNumber: nextRound.roundNumber,
        playerOnStand: {
          id: nextRound.playerOnStandId,
          name: room.players.find(p => p.id === nextRound.playerOnStandId)?.name,
        },
      });
    });

    socket.on('force_advance', () => {
      const room = getPlayerRoom();
      if (!room) return;
      if (room.hostId !== playerId) return emitError('NOT_HOST', 'Only the host can force advance.');
      const round = room.rounds[room.currentRoundIndex];
      if (!round || round.phase !== 'guessing') return emitError('WRONG_PHASE', 'Not in guessing phase.');
      // Reuse trigger_reveal logic by emitting to self
      socket.emit('trigger_reveal');
    });

    socket.on('end_game', () => {
      const room = getPlayerRoom();
      if (!room) return;
      if (room.hostId !== playerId) return emitError('NOT_HOST', 'Only the host can end the game.');
      expireRoom(room.code);
      io.to(room.code).emit('game_ended', {
        reason: 'host_ended',
        finalLeaderboard: buildLeaderboard(room.players),
      });
    });

    socket.on('disconnect', () => {
      const room = getPlayerRoom();
      if (!room) return;
      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      player.connected = false;
      if (room.hostId === playerId) {
        const newHost = promoteNextHost(room);
        if (newHost) {
          io.to(room.code).emit('host_changed', {
            previousHostId: playerId,
            newHostId: newHost.id,
            newHostName: newHost.name,
            reason: 'disconnected',
          });
        }
      }
      io.to(room.code).emit('room_updated', {
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, connected: p.connected })),
        hostId: room.hostId,
      });
    });
  });

  setInterval(() => {
    const now = Date.now();
    io.sockets.sockets.forEach(socket => {
      const playerId = socket.playerId;
      if (!playerId) return;
      for (const roomCode of socket.rooms) {
        if (roomCode === socket.id) continue;
        const room = getRoom(roomCode);
        if (!room) continue;
        const player = room.players.find(p => p.id === playerId);
        if (!player || !player.connected) continue;
        if (now - player.lastHeartbeat > HEARTBEAT_TIMEOUT) {
          player.connected = false;
          socket.disconnect(true);
          if (room.hostId === playerId) {
            const newHost = promoteNextHost(room);
            if (newHost) {
              io.to(room.code).emit('host_changed', {
                previousHostId: playerId,
                newHostId: newHost.id,
                newHostName: newHost.name,
                reason: 'disconnected',
              });
            }
          }
          io.to(room.code).emit('room_updated', {
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, connected: p.connected })),
            hostId: room.hostId,
          });
        }
      }
    });
  }, DISCONNECT_CHECK_INTERVAL);
}

module.exports = { registerSocketHandlers };
