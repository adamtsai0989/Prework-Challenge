const rooms = new Map();

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(hostId, mode) {
  const code = generateCode();
  const room = {
    code,
    hostId,
    players: [],
    playerOrder: [],
    status: 'lobby',
    mode,
    rounds: [],
    currentRoundIndex: -1,
    createdAt: Date.now(),
    expiresAt: null,
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code);
}

function expireRoom(code) {
  const room = rooms.get(code);
  if (room) {
    room.status = 'ended';
    room.expiresAt = Date.now();
  }
}

function isExpired(room) {
  return room.status === 'ended' || room.expiresAt !== null;
}

setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (room.expiresAt !== null && room.expiresAt < oneHourAgo) {
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000);

module.exports = { createRoom, getRoom, expireRoom, isExpired };
