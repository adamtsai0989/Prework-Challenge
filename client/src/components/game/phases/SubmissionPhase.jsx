import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import { useSocket } from '../../../context/SocketContext';
import { isClean } from '../../../utils/profanityFilter';
import './SubmissionPhase.css';

export function SubmissionPhase() {
  const { state, dispatch } = useGame();
  const socket = useSocket();
  const [texts, setTexts] = useState(['', '', '']);
  const [lieIndex, setLieIndex] = useState(null);
  const [errors, setErrors] = useState(['', '', '']);
  const [submitError, setSubmitError] = useState('');

  function updateText(i, value) {
    const next = [...texts];
    next[i] = value;
    setTexts(next);
    const nextErrors = [...errors];
    nextErrors[i] = '';
    setErrors(nextErrors);
  }

  function validate() {
    const nextErrors = texts.map(t => {
      if (!t.trim()) return 'Required';
      if (!isClean(t)) return 'Please keep it work-appropriate.';
      return '';
    });
    setErrors(nextErrors);
    return nextErrors.every(e => e === '');
  }

  function handleSubmit() {
    setSubmitError('');
    if (!validate()) return;
    if (lieIndex === null) {
      setSubmitError('Mark which statement is the lie.');
      return;
    }

    const statements = texts.map((text, i) => ({ text: text.trim(), isLie: i === lieIndex }));

    if (state.mode === 'realtime' && socket) {
      socket.emit('submit_statements', { statements });
    } else {
      dispatch({ type: 'OFFLINE_SUBMIT_STATEMENTS', statements });
    }
  }

  return (
    <div className="submission-phase">
      <h2 className="phase-title">Your Turn on the Stand</h2>
      <p className="phase-subtitle">Write two truths and one lie. Mark which one is the lie.</p>

      <div className="statements-form">
        {texts.map((text, i) => (
          <div key={i} className={`statement-row ${lieIndex === i ? 'marked-lie' : ''}`}>
            <label className="statement-label">Statement {i + 1}</label>
            <div className="statement-input-row">
              <input
                className={`statement-input ${errors[i] ? 'error' : ''}`}
                type="text"
                value={text}
                maxLength={120}
                placeholder={i === 0 ? 'e.g. I once visited 12 countries in a year' : ''}
                onChange={e => updateText(i, e.target.value)}
              />
              <label className="lie-radio-label" title="Mark as the lie">
                <input
                  type="radio"
                  name="lie"
                  checked={lieIndex === i}
                  onChange={() => setLieIndex(i)}
                />
                <span className="lie-indicator">Lie</span>
              </label>
            </div>
            {errors[i] && <span className="field-error">{errors[i]}</span>}
          </div>
        ))}
      </div>

      {submitError && <p className="submit-error">{submitError}</p>}

      <button className="btn-primary" onClick={handleSubmit}>
        Submit Statements
      </button>
    </div>
  );
}
