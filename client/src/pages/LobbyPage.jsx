import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, initialGameState } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { PlayerList } from '../components/lobby/PlayerList';
import { showToast } from '../components/layout/Toast';
import { isClean } from '../utils/profanityFilter';
import './LobbyPage.css';

export function LobbyPage() {
  const { state, dispatch, init } = useGame();
  const socket = useSocket();
  const navigate = useNavigate();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addError, setAddError] = useState('');

  const { roomCode, players, isHost, localPlayerId, mode, debugMode } = state;
  const hostPlayerId = players.find(p => isHost ? p.id === localPlayerId : false)?.id ?? players[0]?.id ?? '';

  useEffect(() => {
    if (!socket) return;
    socket.on('host_changed', (data) => {
      showToast(`${data.newHostName} is now the host`);
      dispatch({ type: 'SET_HOST', hostId: data.newHostId });
    });
  }, [socket]);

  useEffect(() => {
    if (state.currentRoundNumber > 0) {
      navigate(`/game/${roomCode}`);
    }
  }, [state.currentRoundNumber]);

  const minPlayers = debugMode ? 1 : 3;
  const canStart = isHost && players.length >= minPlayers;

  function handleLeave() {
    if (socket) socket.disconnect();
    init(initialGameState);
    navigate('/');
  }

  function handleStart() {
    if (mode === 'realtime' && socket) {
      socket.emit('start_game', { debug: debugMode });
    } else {
      dispatch({
        type: 'GAME_STARTED',
        playerOrder: players.map(p => p.id),
        firstPlayerOnStand: players[0],
        roundNumber: 1,
        totalRounds: players.length,
      });
      navigate(`/game/${roomCode}`);
    }
  }

  function handleAddPlayer() {
    setAddError('');
    const name = newPlayerName.trim();
    if (!name) return setAddError('Enter a name.');
    if (!isClean(name)) return setAddError('Please choose a different name.');
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return setAddError('That name is already taken.');
    }
    if (players.length >= 10) return setAddError('Room is full (10 players max).');

    dispatch({ type: 'ADD_PLAYER', id: crypto.randomUUID(), name });
    setNewPlayerName('');
  }

  function handleRemovePlayer(id) {
    dispatch({ type: 'REMOVE_PLAYER', id });
  }

  return (
    <div className="lobby-page">
      <div className="lobby-card">
        <div className="lobby-header">
          <h1 className="lobby-title">Waiting Room</h1>
          {mode === 'realtime' && (
            <div className="room-code-display">
              <span className="room-code-label">Room Code</span>
              <span className="room-code-value">{roomCode}</span>
            </div>
          )}
        </div>

        <p className="lobby-hint">
          {mode === 'offline'
            ? "Add all players below, then start the game."
            : 'Share the room code so teammates can join.'}
        </p>

        <div className="lobby-section-label">Players ({players.length}/10)</div>
        <PlayerList
          players={players}
          hostId={hostPlayerId}
          localPlayerId={localPlayerId}
          onRemove={mode === 'offline' ? handleRemovePlayer : null}
          localIsHost={isHost}
        />

        {mode === 'offline' && players.length < 10 && (
          <div className="add-player-row">
            <input
              className="form-input add-player-input"
              type="text"
              maxLength={24}
              placeholder="Player name…"
              value={newPlayerName}
              onChange={e => { setNewPlayerName(e.target.value); setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
            />
            <button className="btn-primary add-player-btn" onClick={handleAddPlayer}>
              Add
            </button>
          </div>
        )}
        {addError && <p className="add-player-error">{addError}</p>}

        {isHost && (
          <div className="lobby-actions">
            {!canStart && (
              <p className="lobby-min-hint">
                Need at least {minPlayers} player{minPlayers > 1 ? 's' : ''} to start
                {debugMode ? ' (debug mode)' : ''}.
              </p>
            )}
            <button className="btn-primary btn-full" onClick={handleStart} disabled={!canStart}>
              Start Game
            </button>
          </div>
        )}

        {!isHost && (
          <p className="waiting-for-host">Waiting for the host to start…</p>
        )}

        <button className="btn-ghost btn-leave" onClick={handleLeave}>
          ← Leave Room
        </button>
      </div>
    </div>
  );
}
