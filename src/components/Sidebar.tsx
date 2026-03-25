import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Library, Upload, Wallet, X, KeyRound, ArrowLeftRight, TrendingUp, Sun, Moon, Compass } from 'lucide-react';
import { useWallet, truncateKey } from '../hooks/useWallet';
import { useSidebar } from '../hooks/useSidebar';
import { useTheme } from '../hooks/useTheme';

export default function Sidebar() {
    const { isConnected, publicKey, address, isLoading, connect, connectFromKeys } = useWallet();
    const { isOpen, close } = useSidebar();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const prevPathRef = useRef(location.pathname);
    const [showImport, setShowImport] = useState(false);
    const [importPub, setImportPub] = useState('');
    const [importPriv, setImportPriv] = useState('');
    const [importError, setImportError] = useState('');

    // Close sidebar only on actual route changes (not initial mount)
    useEffect(() => {
        if (prevPathRef.current !== location.pathname) {
            close();
            prevPathRef.current = location.pathname;
        }
    }, [location.pathname, close]);

    // Close sidebar on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) close();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [close]);

    const handleImport = async () => {
        if (!importPub.trim() || !importPriv.trim()) {
            setImportError('Both keys are required');
            return;
        }
        setImportError('');
        try {
            await connectFromKeys({
                publicKey: importPub.trim(),
                privateKey: importPriv.trim(),
            });
            setShowImport(false);
            setImportPub('');
            setImportPriv('');
        } catch {
            setImportError('Failed to connect — check your keys');
        }
    };

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
                    <NavLink
                        to="/trade"
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    >
                        <ArrowLeftRight />
                        Trade
                    </NavLink>
                    <NavLink
                        to="/royalties"
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    >
                        <TrendingUp />
                        Royalties
                    </NavLink>
                    <NavLink
                        to="/explorer"
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    >
                        <Compass />
                        Explorer
                    </NavLink>
                </nav>

                <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>

                <div className="sidebar-wallet">
                    {isConnected ? (
                        <NavLink to="/wallet" className="wallet-btn connected" style={{ textDecoration: 'none' }}>
                            <span className="wallet-dot" />
                            <span style={{ flex: 1, textAlign: 'left' }}>
                                {address ? truncateKey(address) : truncateKey(publicKey!)}
                            </span>
                            <Wallet size={14} />
                        </NavLink>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button
                                className="wallet-btn"
                                onClick={connect}
                                disabled={isLoading}
                            >
                                <span className="wallet-dot" />
                                <span style={{ flex: 1, textAlign: 'left' }}>
                                    {isLoading ? 'Connecting...' : 'New Wallet'}
                                </span>
                                <Wallet size={14} />
                            </button>
                            <button
                                className="wallet-btn"
                                onClick={() => setShowImport(true)}
                                disabled={isLoading}
                                style={{ fontSize: '0.75rem' }}
                            >
                                <KeyRound size={14} />
                                <span style={{ flex: 1, textAlign: 'left' }}>
                                    Import Existing
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Import Wallet Modal */}
            {showImport && (
                <div
                    className="sidebar-overlay"
                    style={{
                        zIndex: 1100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={() => setShowImport(false)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: 24,
                            maxWidth: 440,
                            width: '90%',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        }}
                    >
                        <h3 style={{ marginBottom: 4 }}>Import RougeChain Wallet</h3>
                        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                            Paste your existing RougeChain public and private keys.
                            Keys are stored in session only — cleared when you close the tab.
                        </p>

                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>
                                Public Key
                            </label>
                            <textarea
                                className="form-input"
                                placeholder="Paste your public key..."
                                value={importPub}
                                onChange={e => setImportPub(e.target.value)}
                                rows={2}
                                style={{ fontFamily: 'monospace', fontSize: '0.7rem', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>
                                Private Key
                            </label>
                            <textarea
                                className="form-input"
                                placeholder="Paste your private key..."
                                value={importPriv}
                                onChange={e => setImportPriv(e.target.value)}
                                rows={2}
                                style={{ fontFamily: 'monospace', fontSize: '0.7rem', resize: 'vertical' }}
                            />
                        </div>

                        {importError && (
                            <p style={{ color: '#b91c1c', fontSize: '0.75rem', marginBottom: 12 }}>
                                {importError}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleImport}
                                disabled={!importPub.trim() || !importPriv.trim()}
                                style={{ flex: 1 }}
                            >
                                Connect
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowImport(false);
                                    setImportError('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
