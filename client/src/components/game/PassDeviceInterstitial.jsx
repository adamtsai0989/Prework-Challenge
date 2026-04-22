import './PassDeviceInterstitial.css';

export function PassDeviceInterstitial({ name, action, onReady }) {
  return (
    <div className="pass-interstitial">
      <div className="pass-card">
        <p className="pass-instruction">Pass the device to</p>
        <h2 className="pass-name">{name}</h2>
        <p className="pass-action">
          {action === 'submit'
            ? "It's your turn to submit your statements."
            : "It's your turn to guess the lie."}
        </p>
        <button className="btn-primary" onClick={onReady}>
          I'm ready →
        </button>
      </div>
    </div>
  );
}
