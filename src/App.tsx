import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlayerProvider } from './hooks/usePlayer';
import { WalletProvider } from './hooks/useWallet';
import { SidebarProvider } from './hooks/useSidebar';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import MobileHeader from './components/MobileHeader';
import Home from './pages/Home';
import SearchPage from './pages/Search';
import LibraryPage from './pages/Library';
import UploadPage from './pages/Upload';
import TrackDetail from './pages/TrackDetail';
import ArtistProfile from './pages/ArtistProfile';

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <PlayerProvider>
          <SidebarProvider>
            <div className="app-layout">
              <Sidebar />
              <div className="main-content">
                <MobileHeader />
                <div className="page-content">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/track/:id" element={<TrackDetail />} />
                    <Route path="/artist/:id" element={<ArtistProfile />} />
                  </Routes>
                </div>
                <PlayerBar />
              </div>
            </div>
          </SidebarProvider>
        </PlayerProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}
