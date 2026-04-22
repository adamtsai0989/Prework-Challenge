const { Router } = require('express');
const { createRoom, getRoom, expireRoom, isExpired } = require('./roomStore');
const { isClean } = require('./profanity');

const router = Router();

router.post('/rooms', (req, res) => {
  const { hostName, mode } = req.body;

  if (!hostName || typeof hostName !== 'string' || !hostName.trim()) {
    return res.status(400).json({ error: 'hostName is required' });
  }
  if (!isClean(hostName)) {
    return res.status(400).json({ error: 'PROFANITY', message: 'Please choose a different name.' });
  }
  if (mode !== 'realtime' && mode !== 'offline') {
    return res.status(422).json({ error: 'mode must be realtime or offline' });
  }

  const playerId = crypto.randomUUID();
  const room = createRoom(playerId, mode);

  room.players.push({
    id: playerId,
    name: hostName.trim(),
    score: 0,
    joinOrder: 0,
    connected: false,
    lastHeartbeat: Date.now(),
    socketId: '',
  });
  room.playerOrder.push(playerId);

  res.status(201).json({ roomCode: room.code, playerId, playerToken: playerId });
});

router.post('/rooms/:code/join', (req, res) => {
  const { name } = req.body;
  const code = req.params.code.toUpperCase();

  const room = getRoom(code);
  if (!room) {
    return res.status(404).json({ error: 'ROOM_EXPIRED', message: 'This session has ended or does not exist.' });
  }
  if (isExpired(room)) {
    return res.status(404).json({ error: 'ROOM_EXPIRED', message: 'This session has ended.' });
  }
  if (room.status !== 'lobby') {
    return res.status(409).json({ error: 'Game already started.' });
  }
  if (room.players.length >= 10) {
    return res.status(409).json({ error: 'ROOM_FULL', message: 'This room is full.' });
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!isClean(name)) {
    return res.status(400).json({ error: 'PROFANITY', message: 'Please choose a different name.' });
  }

  const playerId = crypto.randomUUID();
  room.players.push({
    id: playerId,
    name: name.trim(),
    score: 0,
    joinOrder: room.players.length,
    connected: false,
    lastHeartbeat: Date.now(),
    socketId: '',
  });
  room.playerOrder.push(playerId);

  res.status(200).json({
    playerId,
    playerToken: playerId,
    room: {
      code: room.code,
      hostId: room.hostId,
      players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
      status: room.status,
      mode: room.mode,
    },
  });
});

router.delete('/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const token = req.headers.authorization?.replace('Bearer ', '');
  const room = getRoom(code);

  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.hostId !== token) return res.status(403).json({ error: 'Only the host can close the room.' });

  expireRoom(code);
  res.status(204).send();
});

module.exports = router;
