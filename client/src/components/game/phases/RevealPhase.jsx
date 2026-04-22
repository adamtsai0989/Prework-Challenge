import { useGame } from '../../../context/GameContext';
import { useSocket } from '../../../context/SocketContext';
import { StatementRevealCard } from '../reveal/StatementRevealCard';
import { MiniLeaderboard } from '../MiniLeaderboard';
import './RevealPhase.css';

export function RevealPhase() {
  const { state, dispatch } = useGame();
  const socket = useSocket();
  const { revealStatements, correctIndex, myGuess, scoreDeltas, isHost, isLastRound, mode, localPlayerId } = state;

  function handleNext() {
    if (mode === 'realtime' && socket) {
      socket.emit('advance_round');
    } else {
      dispatch({ type: 'OFFLINE_NEXT_ROUND' });
    }
  }

  function handleEndGame() {
    if (mode === 'realtime' && socket) {
      socket.emit('end_game');
    } else {
      dispatch({ type: 'GAME_ENDED' });
    }
  }

  const myDelta = scoreDeltas.find(d => d.playerId === localPlayerId);

  return (
    <div className="reveal-phase">
      <h2 className="phase-title">The Reveal</h2>

      {myDelta && (
        <div className={`score-delta ${myDelta.delta > 0 ? 'positive' : 'zero'}`}>
          {myDelta.delta > 0 ? `+${myDelta.delta} points!` : 'No points this round'}
        </div>
      )}

      <div className="reveal-cards">
        {revealStatements.map((s, i) => (
          <StatementRevealCard
            key={i}
            text={s.text}
            isLie={s.isLie}
            index={i}
            correctIndex={correctIndex}
            myGuess={myGuess}
            delay={i * 300}
          />
        ))}
      </div>

      <div className="guess-breakdown">
        <h3>Who guessed what</h3>
        <ul>
          {state.guessResults.map(g => (
            <li key={g.playerId} className={g.correct ? 'correct' : 'wrong'}>
              <span>{g.name}</span>
              <span>{g.correct ? '✓ Got it' : '✗ Fooled'}</span>
            </li>
          ))}
        </ul>
      </div>

      <MiniLeaderboard />

      {(isHost || mode === 'offline') && (
        <div className="reveal-actions">
          {!isLastRound ? (
            <button className="btn-primary" onClick={handleNext}>Next Round →</button>
          ) : (
            <button className="btn-primary" onClick={handleEndGame}>See Final Results 🏆</button>
          )}
        </div>
      )}

      {!isHost && mode === 'realtime' && (
        <p className="waiting-host">Waiting for the host to advance…</p>
      )}
    </div>
  );
}
