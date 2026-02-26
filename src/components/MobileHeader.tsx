import { Menu } from 'lucide-react';
import { useSidebar } from '../hooks/useSidebar';

export default function MobileHeader() {
    const { open } = useSidebar();

    return (
        <div className="mobile-header">
            <button className="mobile-menu-btn" onClick={open}>
                <Menu size={22} />
            </button>
            <h1 className="mobile-logo">
                q<span>Rougee</span>
            </h1>
            <div className="mobile-header-spacer" />
        </div>
    );
}
