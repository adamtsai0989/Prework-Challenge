import { useGame } from '../../../context/GameContext';
import { useSocket } from '../../../context/SocketContext';
import { GuessProgressBar } from '../GuessProgressBar';
import './WaitingPhase.css';

export function WaitingPhase() {
  const { state } = useGame();
  const socket = useSocket();
  const allGuessed = state.guessCount >= state.totalGuessers && state.totalGuessers > 0;

  function handleReveal() {
    if (socket) socket.emit('trigger_reveal');
  }

  return (
    <div className="waiting-phase">
      <h2 className="phase-title">Waiting for guesses…</h2>
      <p className="phase-subtitle">Your statements have been sent. Stay poker-faced!</p>
      <GuessProgressBar />
      {allGuessed && (
        <div className="reveal-ready">
          <p>Everyone has guessed. Ready to reveal?</p>
          <button className="btn-primary btn-reveal" onClick={handleReveal}>
            Reveal the Lie 🎭
          </button>
        </div>
      )}
    </div>
  );
}
