import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader } from 'lucide-react';
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

// Route-level code splitting — only Home ships in the main bundle; every other
// page loads on demand, cutting first-paint JS.
const SearchPage = lazy(() => import('./pages/Search'));
const LibraryPage = lazy(() => import('./pages/Library'));
const UploadPage = lazy(() => import('./pages/Upload'));
const TrackDetail = lazy(() => import('./pages/TrackDetail'));
const ArtistProfile = lazy(() => import('./pages/ArtistProfile'));
const TradePage = lazy(() => import('./pages/Trade'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Collectibles = lazy(() => import('./pages/Collectibles'));
const PlaylistsPage = lazy(() => import('./pages/Playlists'));
const PlaylistDetail = lazy(() => import('./pages/Playlists').then(m => ({ default: m.PlaylistDetail })));
const RoyaltyDashboard = lazy(() => import('./pages/RoyaltyDashboard'));
const WalletPage = lazy(() => import('./pages/Wallet'));
const Explorer = lazy(() => import('./pages/Explorer'));

function RouteFallback() {
  return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <Loader size={22} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

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
                    <Suspense fallback={<RouteFallback />}>
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
                    </Suspense>
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
