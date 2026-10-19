import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ListMusic, Heart, Play, Plus, Trash2, Pencil, Loader, Music } from 'lucide-react';
import { usePlaylists } from '../hooks/usePlaylists';
import { usePlayer } from '../hooks/usePlayer';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import { useNftTracks } from '../hooks/useNftTracks';
import TrackRow from '../components/TrackRow';
import { MOCK_TRACKS, type Track } from '../data/mockData';

const LIKED_ID = 'liked';

function useTrackIndex(): Map<string, Track> {
    const { allTracksUnfiltered } = useNftTracks();
    return useMemo(() => {
        const m = new Map<string, Track>();
        for (const t of [...allTracksUnfiltered, ...MOCK_TRACKS]) if (!m.has(t.id)) m.set(t.id, t);
        return m;
    }, [allTracksUnfiltered]);
}

/* ── List of playlists ────────────────────────────────────────── */

export default function PlaylistsPage() {
    const { playlists, create, remove } = usePlaylists();
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const navigate = useNavigate();

    const submit = () => {
        if (!name.trim()) return;
        const id = create(name);
        setName(''); setCreating(false);
        navigate(`/playlists/${id}`);
    };

    return (
        <div className="page-container">
            <h1 style={{ marginBottom: 8 }}>Your Library</h1>
            <p className="text-muted" style={{ marginBottom: 24 }}>Liked songs and playlists.</p>

            {/* Liked Songs — on-chain */}
            <Link to={`/playlists/${LIKED_ID}`} className="playlist-card" style={cardStyle}>
                <div style={{ ...artStyle, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}>
                    <Heart size={30} fill="#fff" color="#fff" />
                </div>
                <div>
                    <div style={{ fontWeight: 700 }}>Liked Songs</div>
                    <div className="text-sm text-muted">Everything you’ve liked on-chain</div>
                </div>
            </Link>

            <div className="section-header" style={{ marginTop: 32 }}>
                <h2>Playlists</h2>
                <button className="btn btn-secondary" onClick={() => setCreating(v => !v)} style={{ padding: '6px 14px' }}>
                    <Plus size={14} /> New Playlist
                </button>
            </div>

            {creating && (
                <div style={{ display: 'flex', gap: 8, margin: '12px 0 20px', maxWidth: 420 }}>
                    <input
                        className="form-input" autoFocus placeholder="Playlist name"
                        value={name} onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setCreating(false); }}
                    />
                    <button className="btn btn-primary" onClick={submit} disabled={!name.trim()}>Create</button>
                </div>
            )}

            {playlists.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 40 }}>
                    <ListMusic size={32} />
                    <h3>No playlists yet</h3>
                    <p>Create one, then add tracks from any song’s page.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    {playlists.map(p => (
                        <Link key={p.id} to={`/playlists/${p.id}`} className="playlist-card" style={cardStyle}>
                            <div style={{ ...artStyle, background: 'var(--surface)' }}>
                                <ListMusic size={26} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                <div className="text-sm text-muted">{p.trackIds.length} track{p.trackIds.length !== 1 ? 's' : ''}</div>
                            </div>
                            <button
                                className="player-btn" title="Delete playlist"
                                onClick={e => { e.preventDefault(); if (confirm(`Delete playlist "${p.name}"?`)) remove(p.id); }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── One playlist (or Liked Songs) ────────────────────────────── */

export function PlaylistDetail() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { get, rename, remove, removeTrack } = usePlaylists();
    const { play } = usePlayer();
    const { walletKeys } = useWallet();
    const rc = useRougeChain();
    const trackIndex = useTrackIndex();

    const isLiked = id === LIKED_ID;
    const playlist = isLiked ? undefined : get(id);

    const [likedTracks, setLikedTracks] = useState<Track[]>([]);
    const [loadingLiked, setLoadingLiked] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [draftName, setDraftName] = useState('');

    useEffect(() => {
        if (!isLiked || !walletKeys?.publicKey) return;
        let cancelled = false;
        setLoadingLiked(true);
        (async () => {
            try {
                const ids = await rc.social.getUserLikes(walletKeys.publicKey);
                if (!cancelled) setLikedTracks(ids.map(tid => trackIndex.get(tid)).filter(Boolean) as Track[]);
            } catch {
                if (!cancelled) setLikedTracks([]);
            } finally {
                if (!cancelled) setLoadingLiked(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isLiked, walletKeys, rc, trackIndex]);

    const tracks: Track[] = useMemo(() => {
        if (isLiked) return likedTracks;
        if (!playlist) return [];
        return playlist.trackIds.map(tid => trackIndex.get(tid)).filter(Boolean) as Track[];
    }, [isLiked, likedTracks, playlist, trackIndex]);

    const title = isLiked ? 'Liked Songs' : playlist?.name ?? 'Playlist';

    const playAll = useCallback(() => {
        if (tracks.length) play(tracks[0], tracks);
    }, [tracks, play]);

    if (!isLiked && !playlist) {
        return (
            <div className="page-container">
                <div className="empty-state" style={{ paddingTop: 100 }}>
                    <ListMusic size={32} />
                    <h3>Playlist not found</h3>
                    <Link to="/playlists" className="btn btn-secondary" style={{ marginTop: 12 }}>Back to library</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
                <div style={{
                    width: 120, height: 120, borderRadius: 12, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isLiked ? 'linear-gradient(135deg,#8b5cf6,#ec4899)' : 'var(--surface)',
                }}>
                    {isLiked ? <Heart size={44} fill="#fff" color="#fff" /> : <ListMusic size={40} />}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {isLiked ? 'On-chain · Playlist' : 'Playlist'}
                    </div>
                    {renaming ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <input
                                className="form-input" autoFocus value={draftName}
                                onChange={e => setDraftName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') { rename(id, draftName); setRenaming(false); }
                                    if (e.key === 'Escape') setRenaming(false);
                                }}
                            />
                            <button className="btn btn-primary" onClick={() => { rename(id, draftName); setRenaming(false); }}>Save</button>
                        </div>
                    ) : (
                        <h1 style={{ margin: '4px 0' }}>{title}</h1>
                    )}
                    <div className="text-sm text-muted">{tracks.length} track{tracks.length !== 1 ? 's' : ''}</div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={playAll} disabled={tracks.length === 0}>
                    <Play size={14} /> Play
                </button>
                {!isLiked && (
                    <>
                        <button className="btn btn-secondary" onClick={() => { setDraftName(playlist!.name); setRenaming(true); }}>
                            <Pencil size={14} /> Rename
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => { if (confirm(`Delete playlist "${playlist!.name}"?`)) { remove(id); navigate('/playlists'); } }}
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </>
                )}
            </div>

            {/* Tracks */}
            {isLiked && !walletKeys ? (
                <div className="empty-state" style={{ paddingTop: 40 }}>
                    <Heart size={32} />
                    <h3>Connect your wallet</h3>
                    <p>Your liked songs live on-chain — connect to see them here.</p>
                </div>
            ) : loadingLiked ? (
                <div className="empty-state" style={{ paddingTop: 40 }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <p>Loading liked songs…</p>
                </div>
            ) : tracks.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 40 }}>
                    <Music size={32} />
                    <h3>Nothing here yet</h3>
                    <p>{isLiked ? 'Like tracks and they’ll show up here.' : 'Add tracks from any song’s page.'}</p>
                </div>
            ) : (
                <div className="track-rows">
                    {tracks.map(track => (
                        <TrackRow
                            key={track.id}
                            track={track}
                            queue={tracks}
                            onRemove={isLiked ? undefined : () => removeTrack(id, track.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14, padding: 12,
    border: '1px solid var(--border)', borderRadius: 12, textDecoration: 'none', color: 'inherit',
};
const artStyle: React.CSSProperties = {
    width: 56, height: 56, borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
