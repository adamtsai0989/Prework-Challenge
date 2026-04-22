import './PlayerList.css';

export function PlayerList({ players, hostId, localPlayerId, onRemove, localIsHost }) {
  return (
    <ul className="player-list">
      {players.map(p => (
        <li key={p.id} className={`player-item ${p.id === localPlayerId ? 'you' : ''} ${p.connected === false ? 'disconnected' : ''}`}>
          <span className="player-name">{p.name}{p.id === localPlayerId ? ' (you)' : ''}</span>
          {p.id === hostId && <span className="host-badge">Host</span>}
          {p.score > 0 && <span className="player-score">{p.score} pts</span>}
          {onRemove && localIsHost && p.id !== localPlayerId && (
            <button className="remove-player-btn" onClick={() => onRemove(p.id)} title="Remove player">
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
