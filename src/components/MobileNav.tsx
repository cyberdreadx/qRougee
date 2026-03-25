import { NavLink } from 'react-router-dom';
import { Home, Search, Upload, Library, Wallet } from 'lucide-react';

export default function MobileNav() {
    return (
        <nav className="mobile-nav">
            <NavLink to="/" end className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
                <Home size={20} />
                <span>Home</span>
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
                <Search size={20} />
                <span>Search</span>
            </NavLink>
            <NavLink to="/upload" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
                <Upload size={20} />
                <span>Mint</span>
            </NavLink>
            <NavLink to="/library" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
                <Library size={20} />
                <span>Library</span>
            </NavLink>
            <NavLink to="/wallet" className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
                <Wallet size={20} />
                <span>Wallet</span>
            </NavLink>
        </nav>
    );
}
