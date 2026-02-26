import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlayerProvider } from './hooks/usePlayer';
import { WalletProvider } from './hooks/useWallet';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import Home from './pages/Home';
import SearchPage from './pages/Search';
import LibraryPage from './pages/Library';
import UploadPage from './pages/Upload';
import TrackDetail from './pages/TrackDetail';

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <PlayerProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <div className="page-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/track/:id" element={<TrackDetail />} />
                </Routes>
              </div>
              <PlayerBar />
            </div>
          </div>
        </PlayerProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}
