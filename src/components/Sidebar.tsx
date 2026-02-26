import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Library, Upload, Wallet, X } from 'lucide-react';
import { useWallet, truncateAddress } from '../hooks/useWallet';
import { useSidebar } from '../hooks/useSidebar';

export default function Sidebar() {
    const { isConnected, address, isLoading, connect, disconnect } = useWallet();
    const { isOpen, close } = useSidebar();
    const location = useLocation();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        close();
    }, [location.pathname, close]);

    // Close sidebar on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) close();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [close]);

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div className="sidebar-overlay" onClick={close} />
            )}

            {/* Sidebar */}
            <aside className={`sidebar${isOpen ? ' open' : ''}`}>
                <div className="sidebar-logo">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h1>
                            q<span>Rougee</span>
                        </h1>
                        <button className="sidebar-close" onClick={close}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-title">Menu</div>
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    >
                        <Home />
                        Home
                    </NavLink>
                    <NavLink
                        to="/search"
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    >
                        <Search />
                        Search
                    </NavLink>
                    <NavLink
                        to="/library"
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    >
                        <Library />
                        Library
                    </NavLink>

                    <div className="sidebar-section-title" style={{ marginTop: 12 }}>
                        Create
                    </div>
                    <NavLink
                        to="/upload"
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    >
                        <Upload />
                        Mint Track
                    </NavLink>
                </nav>

                <div className="sidebar-wallet">
                    {isConnected ? (
                        <button className="wallet-btn connected" onClick={disconnect}>
                            <span className="wallet-dot" />
                            <span style={{ flex: 1, textAlign: 'left' }}>
                                {truncateAddress(address!)}
                            </span>
                            <Wallet size={14} />
                        </button>
                    ) : (
                        <button
                            className="wallet-btn"
                            onClick={connect}
                            disabled={isLoading}
                        >
                            <span className="wallet-dot" />
                            <span style={{ flex: 1, textAlign: 'left' }}>
                                {isLoading ? 'Connecting...' : 'Connect Wallet'}
                            </span>
                            <Wallet size={14} />
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
}
