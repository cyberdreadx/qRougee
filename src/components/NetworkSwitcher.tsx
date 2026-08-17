import { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { NETWORKS, getNetworkId, setNetworkId, type NetworkId } from '../config/network';

const dotColor = (id: NetworkId) => (id === 'mainnet' ? '#16a34a' : '#f59e0b');

export default function NetworkSwitcher() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = getNetworkId();

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const select = (id: NetworkId) => {
        if (id === current) { setOpen(false); return; }
        setNetworkId(id);
        // Reload so the memoized SDK client, the extension signer, and any
        // network-specific cached page data all rebuild against the new endpoint.
        window.location.reload();
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                className="theme-toggle"
                onClick={() => setOpen(o => !o)}
                title="Switch network"
                style={{ justifyContent: 'space-between' }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(current), flexShrink: 0 }} />
                    <Globe size={16} />
                    {NETWORKS[current].label}
                </span>
                <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    right: 0,
                    marginBottom: 6,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    overflow: 'hidden',
                    zIndex: 1200,
                }}>
                    {Object.values(NETWORKS).map(net => (
                        <button
                            key={net.id}
                            onClick={() => select(net.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                                padding: '10px 12px',
                                background: net.id === current ? 'var(--surface)' : 'transparent',
                                border: 'none',
                                color: 'var(--fg)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                textAlign: 'left',
                            }}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(net.id), flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{net.label}</span>
                            {net.id === current && <Check size={14} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
