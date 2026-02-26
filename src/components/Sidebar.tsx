import { NavLink } from 'react-router-dom';
import { Home, Search, Library, Upload, Wallet } from 'lucide-react';
import { useWallet, truncateAddress } from '../hooks/useWallet';

export default function Sidebar() {
    const { isConnected, address, isLoading, connect, disconnect } = useWallet();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h1>
                    q<span>Rougee</span>
                </h1>
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
    );
}
