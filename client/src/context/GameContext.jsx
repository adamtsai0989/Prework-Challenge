import { createContext, useContext, useReducer } from 'react';
import { shuffleIndices } from '../utils/shuffle';

export const initialGameState = {
  mode: 'realtime',
  roomCode: '',
  players: [],
  localPlayerId: '',
  localPlayerName: '',
  isHost: false,
  playerToken: '',
  currentRoundNumber: 0,
  totalRounds: 0,
  playerOnStand: null,
  phase: 'submitting',
  shuffledStatements: [],
  revealStatements: [],
  correctIndex: null,
  guessResults: [],
  guessCount: 0,
  totalGuessers: 0,
  myGuess: null,
  scores: [],
  scoreDeltas: [],
  isLastRound: false,
  debugMode: false,
  offlineCurrentActorIndex: 0,
  offlinePhase: 'pass',
  offlineGuesses: {},
  offlineStatements: [],
  offlineShuffledOrder: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYERS':
      return {
        ...state,
        players: action.players,
        isHost: action.hostId === state.localPlayerId,
      };

    case 'ADD_PLAYER':
      return {
        ...state,
        players: [...state.players, { id: action.id, name: action.name, score: 0 }],
      };

    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.id),
      };

    case 'SET_HOST':
      return { ...state, isHost: action.hostId === state.localPlayerId };

    case 'GAME_STARTED':
      return {
        ...state,
        totalRounds: action.totalRounds,
        currentRoundNumber: action.roundNumber,
        playerOnStand: action.firstPlayerOnStand,
        phase: state.localPlayerId === action.firstPlayerOnStand.id ? 'submitting' : 'guessing',
        myGuess: null,
        guessCount: 0,
        shuffledStatements: [],
        revealStatements: [],
        correctIndex: null,
        guessResults: [],
        scoreDeltas: [],
        offlinePhase: 'pass',
        offlineCurrentActorIndex: 0,
        isLastRound: action.totalRounds === 1,
      };

    case 'ROUND_STARTED':
      return {
        ...state,
        currentRoundNumber: action.roundNumber,
        playerOnStand: action.playerOnStand,
        phase: state.localPlayerId === action.playerOnStand.id ? 'submitting' : 'guessing',
        myGuess: null,
        guessCount: 0,
        shuffledStatements: [],
        revealStatements: [],
        correctIndex: null,
        guessResults: [],
        scoreDeltas: [],
      };

    case 'PLAYER_SUBMITTED':
      return {
        ...state,
        shuffledStatements: action.statements,
        phase: state.playerOnStand?.id === state.localPlayerId ? 'waiting' : 'guessing',
      };

    case 'GUESS_COUNT_UPDATED':
      return { ...state, guessCount: action.guessed, totalGuessers: action.total };

    case 'SET_MY_GUESS':
      return { ...state, myGuess: action.index };

    case 'REVEAL':
      return {
        ...state,
        phase: 'reveal',
        revealStatements: action.statements,
        correctIndex: action.correctIndex,
        guessResults: action.guesses,
      };

    case 'SCORES_UPDATED':
      return { ...state, scores: action.leaderboard, scoreDeltas: action.deltas };

    case 'ROUND_COMPLETE':
      return { ...state, isLastRound: action.isLastRound };

    case 'GAME_ENDED':
      return { ...state, phase: 'complete' };

    case 'OFFLINE_SUBMIT_STATEMENTS': {
      const shuffled = shuffleIndices(3);
      return {
        ...state,
        offlineStatements: action.statements,
        offlineShuffledOrder: shuffled,
        offlinePhase: 'pass',
        offlineCurrentActorIndex: 0,
        offlineGuesses: {},
        shuffledStatements: shuffled.map(i => ({ text: action.statements[i].text })),
        phase: 'guessing',
        myGuess: null,
      };
    }

    case 'OFFLINE_SUBMIT_GUESS': {
      const newGuesses = { ...state.offlineGuesses, [action.actorId]: action.index };
      const guessers = state.players.filter(p => p.id !== state.playerOnStand?.id);
      const nextIndex = state.offlineCurrentActorIndex + 1;
      const allDone = nextIndex >= guessers.length;
      return {
        ...state,
        offlineGuesses: newGuesses,
        offlineCurrentActorIndex: nextIndex,
        offlinePhase: allDone ? 'reveal' : 'pass',
        guessCount: Object.keys(newGuesses).length,
        totalGuessers: guessers.length,
        myGuess: null,
      };
    }

    case 'OFFLINE_REVEAL': {
      const correctOriginal = state.offlineStatements.findIndex(s => s.isLie);
      const correctShuffled = state.offlineShuffledOrder.indexOf(correctOriginal);
      const revealStatements = state.offlineShuffledOrder.map(i => state.offlineStatements[i]);

      const guessResults = state.players
        .filter(p => p.id !== state.playerOnStand?.id)
        .map(p => ({
          playerId: p.id,
          name: p.name,
          guessedIndex: state.offlineGuesses[p.id] ?? null,
          correct: state.offlineGuesses[p.id] === correctShuffled,
        }));

      const fooled = guessResults.filter(g => !g.correct).length;

      const updatedPlayers = state.players.map(p => {
        if (p.id === state.playerOnStand?.id) return { ...p, score: p.score + fooled };
        return state.offlineGuesses[p.id] === correctShuffled ? { ...p, score: p.score + 2 } : p;
      });

      const leaderboard = [...updatedPlayers]
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({ rank: i + 1, playerId: p.id, name: p.name, score: p.score }));

      const deltas = updatedPlayers.map(p => {
        const prev = state.players.find(op => op.id === p.id)?.score ?? 0;
        const isStand = p.id === state.playerOnStand?.id;
        return {
          playerId: p.id,
          name: p.name,
          previousScore: prev,
          delta: p.score - prev,
          newScore: p.score,
          guessedCorrectly: isStand ? null : (state.offlineGuesses[p.id] === correctShuffled),
        };
      });

      return {
        ...state,
        players: updatedPlayers,
        phase: 'reveal',
        revealStatements,
        correctIndex: correctShuffled,
        guessResults,
        scores: leaderboard,
        scoreDeltas: deltas,
        offlinePhase: 'reveal',
      };
    }

    case 'OFFLINE_NEXT_ROUND': {
      const nextRoundNum = state.currentRoundNumber + 1;
      if (nextRoundNum > state.totalRounds) {
        return { ...state, phase: 'complete' };
      }
      const nextPlayer = state.players[nextRoundNum - 1] ?? null;
      return {
        ...state,
        currentRoundNumber: nextRoundNum,
        playerOnStand: nextPlayer,
        phase: 'submitting',
        offlinePhase: 'pass',
        offlineCurrentActorIndex: 0,
        offlineGuesses: {},
        offlineStatements: [],
        offlineShuffledOrder: [],
        shuffledStatements: [],
        revealStatements: [],
        correctIndex: null,
        guessResults: [],
        scoreDeltas: [],
        myGuess: null,
        guessCount: 0,
        isLastRound: nextRoundNum === state.totalRounds,
      };
    }

    default:
      return state;
  }
}

function initReducer(state, action) {
  if (action.type === '__INIT__') return { ...state, ...action.payload };
  return reducer(state, action);
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(initReducer, initialGameState);

  function init(partial) {
    dispatch({ type: '__INIT__', payload: partial });
  }

  return (
    <GameContext.Provider value={{ state, dispatch, init }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
