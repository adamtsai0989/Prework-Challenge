import './FinalLeaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export function FinalLeaderboard({ leaderboard, localPlayerId }) {
  return (
    <div className="final-lb">
      <ol className="final-lb-list">
        {leaderboard.map((entry, i) => (
          <li
            key={entry.playerId}
            className={`final-lb-row rank-${entry.rank} ${entry.playerId === localPlayerId ? 'you' : ''}`}
          >
            <span className="final-lb-medal">{MEDALS[i] ?? `#${entry.rank}`}</span>
            <span className="final-lb-name">{entry.name}{entry.playerId === localPlayerId ? ' (you)' : ''}</span>
            <span className="final-lb-score">{entry.score} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
