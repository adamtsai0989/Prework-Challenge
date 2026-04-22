import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider, useGame } from './context/GameContext';
import { SocketProvider } from './context/SocketContext';
import { DebugBanner } from './components/layout/DebugBanner';
import { ToastContainer } from './components/layout/Toast';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { EndPage } from './pages/EndPage';
import { useDebugMode } from './hooks/useDebugMode';

function AppRoutes() {
  const { state } = useGame();
  const debugMode = useDebugMode();

  return (
    <SocketProvider
      token={state.playerToken}
      roomCode={state.roomCode}
      enabled={state.mode === 'realtime' && !!state.playerToken}
    >
      {debugMode && <DebugBanner />}
      <ToastContainer />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:code" element={<LobbyPage />} />
        <Route path="/game/:code" element={<GamePage />} />
        <Route path="/end/:code" element={<EndPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <AppRoutes />
      </GameProvider>
    </BrowserRouter>
  );
}
