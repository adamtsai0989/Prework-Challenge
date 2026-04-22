import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useGame } from './GameContext';

const SERVER_URL = 'http://localhost:3001';
const HEARTBEAT_INTERVAL = 15_000;

const SocketContext = createContext(null);

export function SocketProvider({ children, token, roomCode, enabled }) {
  const socketRef = useRef(null);
  const { dispatch } = useGame();

  useEffect(() => {
    if (!enabled || !token || !roomCode) return;

    const socket = io(SERVER_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join_room', { roomCode }));

    socket.on('room_updated', ({ players, hostId }) => {
      dispatch({ type: 'SET_PLAYERS', players, hostId });
    });

    socket.on('game_started', (data) => {
      dispatch({
        type: 'GAME_STARTED',
        playerOrder: data.playerOrder,
        firstPlayerOnStand: data.firstPlayerOnStand,
        roundNumber: data.roundNumber,
        totalRounds: data.totalRounds,
      });
    });

    socket.on('round_started', (data) => {
      dispatch({ type: 'ROUND_STARTED', playerOnStand: data.playerOnStand, roundNumber: data.roundNumber });
    });

    socket.on('player_submitted', (data) => {
      dispatch({ type: 'PLAYER_SUBMITTED', statements: data.statements });
    });

    socket.on('guess_count_updated', (data) => {
      dispatch({ type: 'GUESS_COUNT_UPDATED', guessed: data.guessed, total: data.total });
    });

    socket.on('reveal', (data) => {
      dispatch({ type: 'REVEAL', statements: data.statements, correctIndex: data.correctIndex, guesses: data.guesses });
    });

    socket.on('scores_updated', (data) => {
      dispatch({ type: 'SCORES_UPDATED', deltas: data.deltas, leaderboard: data.leaderboard });
    });

    socket.on('round_complete', (data) => {
      dispatch({ type: 'ROUND_COMPLETE', isLastRound: data.isLastRound });
    });

    socket.on('game_ended', () => dispatch({ type: 'GAME_ENDED' }));

    socket.on('host_changed', (data) => {
      dispatch({ type: 'SET_HOST', hostId: data.newHostId });
    });

    const heartbeat = setInterval(() => {
      if (socket.connected) socket.emit('heartbeat');
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, token, roomCode]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
