import { useNavigate } from 'react-router-dom';
import { useGame, initialGameState } from '../context/GameContext';
import { FinalLeaderboard } from '../components/end/FinalLeaderboard';
import './EndPage.css';

export function EndPage() {
  const { state, init } = useGame();
  const navigate = useNavigate();
  const { scores, localPlayerId } = state;

  function handleNewGame() {
    try { localStorage.removeItem('ttol_game_state'); } catch {}
    init(initialGameState);
    navigate('/');
  }

  const winner = scores[0];
  const isWinner = winner?.playerId === localPlayerId;

  return (
    <div className="end-page">
      <div className="end-card">
        <div className="end-header">
          <h1 className="end-title">Game Over!</h1>
          {isWinner && <p className="winner-message">You won! 🏆</p>}
          {!isWinner && winner && <p className="winner-message">{winner.name} takes the crown!</p>}
        </div>

        <FinalLeaderboard leaderboard={scores} localPlayerId={localPlayerId} />

        <button className="btn-primary btn-full end-new-game" onClick={handleNewGame}>
          Play Again
        </button>
      </div>
    </div>
  );
}
