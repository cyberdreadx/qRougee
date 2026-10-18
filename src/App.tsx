import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RougeChainProvider } from './hooks/useRougeChain';
import { NftTracksProvider } from './hooks/useNftTracks';
import { PlaylistsProvider } from './hooks/usePlaylists';
import { PlayerProvider } from './hooks/usePlayer';
import { WalletProvider } from './hooks/useWallet';
import { SidebarProvider } from './hooks/useSidebar';
import { ThemeProvider } from './hooks/useTheme';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import MobileHeader from './components/MobileHeader';
import MobileNav from './components/MobileNav';
import PlayGateConnector from './components/PlayGateConnector';
import Home from './pages/Home';
import SearchPage from './pages/Search';
import LibraryPage from './pages/Library';
import UploadPage from './pages/Upload';
import TrackDetail from './pages/TrackDetail';
import ArtistProfile from './pages/ArtistProfile';
import TradePage from './pages/Trade';
import Marketplace from './pages/Marketplace';
import Collectibles from './pages/Collectibles';
import PlaylistsPage, { PlaylistDetail } from './pages/Playlists';
import RoyaltyDashboard from './pages/RoyaltyDashboard';
import WalletPage from './pages/Wallet';
import Explorer from './pages/Explorer';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <RougeChainProvider>
        <NftTracksProvider>
        <WalletProvider>
          <PlaylistsProvider>
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
                      <Route path="/playlists" element={<PlaylistsPage />} />
                      <Route path="/playlists/:id" element={<PlaylistDetail />} />
                      <Route path="/upload" element={<UploadPage />} />
                      <Route path="/track/:id" element={<TrackDetail />} />
                      <Route path="/artist/:id" element={<ArtistProfile />} />
                      <Route path="/trade" element={<TradePage />} />
                      <Route path="/marketplace" element={<Marketplace />} />
                      <Route path="/collectibles" element={<Collectibles />} />
                      <Route path="/royalties" element={<RoyaltyDashboard />} />
                      <Route path="/wallet" element={<WalletPage />} />
                      <Route path="/explorer" element={<Explorer />} />
                    </Routes>
                  </div>
                  <PlayerBar />
                  <MobileNav />
                  <PlayGateConnector />
                </div>
              </div>
            </SidebarProvider>
          </PlayerProvider>
          </PlaylistsProvider>
        </WalletProvider>
        </NftTracksProvider>
      </RougeChainProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
