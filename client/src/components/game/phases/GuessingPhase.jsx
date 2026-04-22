import { useGame } from '../../../context/GameContext';
import { useSocket } from '../../../context/SocketContext';
import { GuessProgressBar } from '../GuessProgressBar';
import './GuessingPhase.css';

export function GuessingPhase() {
  const { state, dispatch } = useGame();
  const socket = useSocket();
  const { shuffledStatements, myGuess } = state;

  function handleGuess(index) {
    if (myGuess !== null) return;
    dispatch({ type: 'SET_MY_GUESS', index });

    if (state.mode === 'realtime' && socket) {
      socket.emit('submit_guess', { statementIndex: index });
    } else {
      const guessers = state.players.filter(p => p.id !== state.playerOnStand?.id);
      const currentGuesser = guessers[state.offlineCurrentActorIndex];
      if (currentGuesser) {
        dispatch({ type: 'OFFLINE_SUBMIT_GUESS', actorId: currentGuesser.id, index });
      }
    }
  }

  return (
    <div className="guessing-phase">
      <h2 className="phase-title">Which one is the lie?</h2>
      <p className="phase-subtitle">
        {state.playerOnStand?.name} has submitted their statements. Pick the lie.
      </p>

      <div className="statement-cards">
        {shuffledStatements.map((s, i) => (
          <button
            key={i}
            className={`statement-card ${myGuess === i ? 'selected' : ''} ${myGuess !== null && myGuess !== i ? 'dimmed' : ''}`}
            onClick={() => handleGuess(i)}
            disabled={myGuess !== null}
          >
            <span className="card-index">{i + 1}</span>
            <span className="card-text">{s.text}</span>
            {myGuess === i && <span className="card-check">✓ Your guess</span>}
          </button>
        ))}
      </div>

      {myGuess !== null && (
        <div className="guessed-message">
          Locked in! Waiting for others…
          <GuessProgressBar />
        </div>
      )}
    </div>
  );
}
