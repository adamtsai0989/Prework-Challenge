import { useEffect, useState } from 'react';
import './Toast.css';

let toastListeners = [];

export function showToast(message) {
  toastListeners.forEach(fn => fn(message));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (msg) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, text: msg }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    toastListeners.push(handler);
    return () => { toastListeners = toastListeners.filter(fn => fn !== handler); };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.text}</div>
      ))}
    </div>
  );
}
