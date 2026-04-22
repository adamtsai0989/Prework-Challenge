function fisherYates(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shuffleStatements() {
  return fisherYates([0, 1, 2]);
}

function buildLeaderboard(players) {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, playerId: p.id, name: p.name, score: p.score }));
}

function calculateScores(room) {
  const round = room.rounds[room.currentRoundIndex];
  if (!round) return [];

  const correctOriginalIndex = round.statements.findIndex(s => s.isLie);
  const correctShuffledIndex = round.shuffledOrder.indexOf(correctOriginalIndex);
  const deltas = [];

  for (const player of room.players) {
    if (player.id === round.playerOnStandId) continue;
    const guess = round.guesses[player.id];
    const correct = guess === correctShuffledIndex;
    const prev = player.score;
    if (correct) player.score += 2;
    deltas.push({
      playerId: player.id,
      name: player.name,
      previousScore: prev,
      delta: correct ? 2 : 0,
      newScore: player.score,
      guessedCorrectly: correct,
    });
  }

  const standPlayer = room.players.find(p => p.id === round.playerOnStandId);
  if (standPlayer) {
    const fooled = room.players.filter(
      p => p.id !== round.playerOnStandId && round.guesses[p.id] !== correctShuffledIndex
    ).length;
    const prev = standPlayer.score;
    standPlayer.score += fooled;
    deltas.push({
      playerId: standPlayer.id,
      name: standPlayer.name,
      previousScore: prev,
      delta: fooled,
      newScore: standPlayer.score,
      guessedCorrectly: null,
    });
  }

  return deltas;
}

function promoteNextHost(room) {
  const currentHostIndex = room.playerOrder.indexOf(room.hostId);
  for (let i = 1; i <= room.playerOrder.length; i++) {
    const nextIndex = (currentHostIndex + i) % room.playerOrder.length;
    const nextId = room.playerOrder[nextIndex];
    const nextPlayer = room.players.find(p => p.id === nextId && p.connected);
    if (nextPlayer) {
      room.hostId = nextPlayer.id;
      return nextPlayer;
    }
  }
  return null;
}

module.exports = { shuffleStatements, buildLeaderboard, calculateScores, promoteNextHost };
