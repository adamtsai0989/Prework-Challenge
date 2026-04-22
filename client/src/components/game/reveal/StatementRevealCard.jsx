import './StatementRevealCard.css';

export function StatementRevealCard({ text, isLie, index, correctIndex, myGuess, delay }) {
  const isCorrect = index === correctIndex;
  const iGuessedThis = myGuess === index;

  return (
    <div
      className={`reveal-card ${isLie ? 'is-lie' : 'is-truth'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="reveal-card-inner">
        <span className="reveal-index">{index + 1}</span>
        <span className="reveal-text">{text}</span>
        <div className="reveal-badges">
          {isLie && <span className="badge badge-lie">THE LIE</span>}
          {!isLie && <span className="badge badge-truth">TRUTH</span>}
          {iGuessedThis && <span className="badge badge-guess">{isCorrect ? '✓ Correct' : '✗ Wrong'}</span>}
        </div>
      </div>
    </div>
  );
}
