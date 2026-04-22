import { useGame } from '../../context/GameContext';
import './GameHeader.css';

export function GameHeader() {
  const { state } = useGame();
  const { currentRoundNumber, totalRounds, playerOnStand, localPlayerId } = state;
  const isYou = playerOnStand?.id === localPlayerId;

  return (
    <div className="game-header">
      <span className="round-counter">Round {currentRoundNumber} of {totalRounds}</span>
      <span className="on-stand">
        {isYou ? 'Your turn on the stand' : `${playerOnStand?.name ?? ''} is on the stand`}
      </span>
    </div>
  );
}
