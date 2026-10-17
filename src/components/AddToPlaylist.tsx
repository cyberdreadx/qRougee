import { useState, useRef, useEffect } from 'react';
import { Plus, Check, ListMusic } from 'lucide-react';
import { usePlaylists } from '../hooks/usePlaylists';

/** Dropdown that toggles a track in/out of the user's local playlists, with an
 *  inline "New playlist" creator. Playlists are local (per wallet identity). */
export default function AddToPlaylist({ trackId }: { trackId: string }) {
    const { playlists, create, addTrack, removeTrack, has } = usePlaylists();
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false); }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const createAndAdd = () => {
        if (!name.trim()) return;
        addTrack(create(name), trackId);
        setName(''); setCreating(false);
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                onClick={() => setOpen(o => !o)}
            >
                <Plus size={14} /> Add to playlist
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                    width: 250, maxHeight: 320, overflowY: 'auto',
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)', padding: 6,
                }}>
                    {playlists.length === 0 && !creating && (
                        <div className="text-xs text-muted" style={{ padding: 8 }}>No playlists yet.</div>
                    )}
                    {playlists.map(p => (
                        <button key={p.id} onClick={() => has(p.id, trackId) ? removeTrack(p.id, trackId) : addTrack(p.id, trackId)} style={rowStyle}>
                            <ListMusic size={14} />
                            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            {has(p.id, trackId) && <Check size={14} />}
                        </button>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                        {creating ? (
                            <div style={{ display: 'flex', gap: 6, padding: 4 }}>
                                <input
                                    className="form-input" autoFocus placeholder="Playlist name" value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') createAndAdd(); if (e.key === 'Escape') setCreating(false); }}
                                    style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                                />
                                <button className="btn btn-primary" style={{ padding: '4px 10px' }} onClick={createAndAdd}>Add</button>
                            </div>
                        ) : (
                            <button onClick={() => setCreating(true)} style={rowStyle}>
                                <Plus size={14} /> New playlist
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: 8,
    border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit',
    borderRadius: 6, fontSize: '0.85rem',
};
