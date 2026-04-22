import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useDebugMode } from '../hooks/useDebugMode';
import { isClean } from '../utils/profanityFilter';
import './HomePage.css';

const API = 'http://localhost:3001/api';

export function HomePage() {
  const navigate = useNavigate();
  const { init } = useGame();
  const debugMode = useDebugMode();

  const [tab, setTab] = useState('create');
  const [hostName, setHostName] = useState('');
  const [mode, setMode] = useState('realtime');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleCreate() {
    setCreateError('');
    if (!hostName.trim()) return setCreateError('Enter your name.');
    if (!isClean(hostName)) return setCreateError('Please choose a different name.');

    setCreating(true);
    try {
      const res = await fetch(`${API}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: hostName.trim(), mode }),
      });
      const data = await res.json();
      if (!res.ok) return setCreateError(data.message ?? 'Failed to create room.');

      init({
        mode,
        roomCode: data.roomCode,
        localPlayerId: data.playerId,
        localPlayerName: hostName.trim(),
        isHost: true,
        playerToken: data.playerToken,
        debugMode,
        players: [{ id: data.playerId, name: hostName.trim(), score: 0 }],
      });
      navigate(`/lobby/${data.roomCode}`);
    } catch {
      setCreateError('Could not connect to server.');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    setJoinError('');
    if (!joinName.trim()) return setJoinError('Enter your name.');
    if (!joinCode.trim()) return setJoinError('Enter the room code.');
    if (!isClean(joinName)) return setJoinError('Please choose a different name.');

    setJoining(true);
    try {
      const res = await fetch(`${API}/rooms/${joinCode.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: joinName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setJoinError(data.message ?? 'Failed to join room.');

      init({
        mode: data.room.mode,
        roomCode: data.room.code,
        localPlayerId: data.playerId,
        localPlayerName: joinName.trim(),
        isHost: false,
        playerToken: data.playerToken,
        debugMode,
        players: data.room.players,
      });
      navigate(`/lobby/${data.room.code}`);
    } catch {
      setJoinError('Could not connect to server.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="home-page">
      <div className="home-card">
        <h1 className="home-title">Two Truths<br />One Lie</h1>
        <p className="home-subtitle">The classic icebreaker for your team</p>

        <div className="tab-bar">
          <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>Create Game</button>
          <button className={`tab ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>Join Game</button>
        </div>

        {tab === 'create' && (
          <div className="form-section">
            <label className="form-label">Your name</label>
            <input
              className="form-input"
              type="text"
              maxLength={24}
              placeholder="e.g. Alice"
              value={hostName}
              onChange={e => setHostName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />

            <label className="form-label">Game mode</label>
            <div className="mode-options">
              <label className={`mode-option ${mode === 'realtime' ? 'active' : ''}`}>
                <input type="radio" name="mode" value="realtime" checked={mode === 'realtime'} onChange={() => setMode('realtime')} />
                <div>
                  <strong>Everyone has a device</strong>
                  <p>Real-time multiplayer — each player uses their own device</p>
                </div>
              </label>
              <label className={`mode-option ${mode === 'offline' ? 'active' : ''}`}>
                <input type="radio" name="mode" value="offline" checked={mode === 'offline'} onChange={() => setMode('offline')} />
                <div>
                  <strong>Passing one device</strong>
                  <p>Offline mode — share a single device around the room</p>
                </div>
              </label>
            </div>

            {createError && <p className="form-error">{createError}</p>}
            <button className="btn-primary btn-full" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create Room'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="form-section">
            <label className="form-label">Your name</label>
            <input
              className="form-input"
              type="text"
              maxLength={24}
              placeholder="e.g. Bob"
              value={joinName}
              onChange={e => setJoinName(e.target.value)}
            />

            <label className="form-label">Room code</label>
            <input
              className="form-input code-input"
              type="text"
              maxLength={6}
              placeholder="e.g. KFGT2"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />

            {joinError && <p className="form-error">{joinError}</p>}
            <button className="btn-primary btn-full" onClick={handleJoin} disabled={joining}>
              {joining ? 'Joining…' : 'Join Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
