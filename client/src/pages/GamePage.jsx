import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { GameHeader } from '../components/game/GameHeader';
import { SubmissionPhase } from '../components/game/phases/SubmissionPhase';
import { WaitingPhase } from '../components/game/phases/WaitingPhase';
import { GuessingPhase } from '../components/game/phases/GuessingPhase';
import { RevealPhase } from '../components/game/phases/RevealPhase';
import { PassDeviceInterstitial } from '../components/game/PassDeviceInterstitial';
import { showToast } from '../components/layout/Toast';
import './GamePage.css';

export function GamePage() {
  const { state, dispatch } = useGame();
  const socket = useSocket();
  const navigate = useNavigate();
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialName, setInterstitialName] = useState('');
  const [interstitialAction, setInterstitialAction] = useState('submit');

  const { phase, mode, isHost, roomCode, localPlayerId, players, playerOnStand, offlinePhase, offlineCurrentActorIndex } = state;

  useEffect(() => {
    if (!socket) return;
    socket.on('host_changed', (data) => {
      showToast(`${data.newHostName} is now the host`);
      dispatch({ type: 'SET_HOST', hostId: data.newHostId });
    });
  }, [socket]);

  useEffect(() => {
    if (mode !== 'offline') return;

    if (phase === 'submitting' && playerOnStand && playerOnStand.id !== localPlayerId) {
      setInterstitialName(playerOnStand.name);
      setInterstitialAction('submit');
      setShowInterstitial(true);
    }

    if (offlinePhase === 'pass' && phase !== 'submitting') {
      const guessers = players.filter(p => p.id !== playerOnStand?.id);
      const currentGuesser = guessers[offlineCurrentActorIndex];
      if (currentGuesser) {
        setInterstitialName(currentGuesser.name);
        setInterstitialAction('guess');
        setShowInterstitial(true);
      }
    }
  }, [phase, offlinePhase, offlineCurrentActorIndex]);

  useEffect(() => {
    if (phase === 'complete') navigate(`/end/${roomCode}`);
  }, [phase]);

  function handleRevealOffline() {
    dispatch({ type: 'OFFLINE_REVEAL' });
  }


  return (
    <div className="game-page">
      {showInterstitial && (
        <PassDeviceInterstitial
          name={interstitialName}
          action={interstitialAction}
          onReady={() => setShowInterstitial(false)}
        />
      )}

      <div className="game-content">
        <GameHeader />

        {phase === 'submitting' && <SubmissionPhase />}
        {phase === 'waiting' && <WaitingPhase />}
        {phase === 'guessing' && <GuessingPhase />}
        {phase === 'reveal' && <RevealPhase />}

        {mode === 'offline' && offlinePhase === 'reveal' && phase !== 'reveal' && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn-primary" onClick={handleRevealOffline}>Reveal the Lie 🎭</button>
          </div>
        )}

      </div>
    </div>
  );
}
