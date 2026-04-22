import { useGame } from '../../context/GameContext';
import './MiniLeaderboard.css';

export function MiniLeaderboard() {
  const { state } = useGame();
  if (state.scores.length === 0) return null;

  return (
    <div className="mini-leaderboard">
      <h3 className="mini-lb-title">Scores</h3>
      <ol className="mini-lb-list">
        {state.scores.map(entry => (
          <li key={entry.playerId} className={`mini-lb-row ${entry.playerId === state.localPlayerId ? 'you' : ''}`}>
            <span className="mini-lb-rank">#{entry.rank}</span>
            <span className="mini-lb-name">{entry.name}</span>
            <span className="mini-lb-score">{entry.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
