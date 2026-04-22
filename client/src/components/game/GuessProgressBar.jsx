import { useGame } from '../../context/GameContext';
import './GuessProgressBar.css';

export function GuessProgressBar() {
  const { state } = useGame();
  const { guessCount, totalGuessers } = state;

  return (
    <div className="guess-progress">
      <div className="guess-track">
        <div
          className="guess-fill"
          style={{ width: totalGuessers > 0 ? `${(guessCount / totalGuessers) * 100}%` : '0%' }}
        />
      </div>
      <p className="guess-label">{guessCount} of {totalGuessers} players have guessed</p>
    </div>
  );
}
