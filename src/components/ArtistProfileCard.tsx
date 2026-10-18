import { useState } from 'react';
import { User, Check } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { getOverride, setOverride } from '../utils/artistProfile';

/**
 * Lets the connected creator set an artist display name that isn't their wallet
 * name. Keyed by the wallet's public key (which is what app-minted tracks carry
 * as `creator`), so it shows on their tracks via ArtistName. Stored locally for
 * now — see utils/artistProfile for the swappable backend note.
 */
export default function ArtistProfileCard() {
    const { publicKey } = useWallet();
    const [name, setName] = useState(() => (publicKey ? getOverride(publicKey) ?? '' : ''));
    const [saved, setSaved] = useState(false);

    if (!publicKey) return null;

    const save = () => {
        setOverride(publicKey, name);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
    };

    return (
        <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <User size={16} /> <strong>Artist name</strong>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                Shown on your tracks across qRougee instead of your wallet handle. A name you
                set when minting a track still takes priority. Stored on this device for now.
            </p>
            <div style={{ display: 'flex', gap: 8, maxWidth: 440 }}>
                <input
                    className="form-input"
                    placeholder="e.g. DJ Nightfall"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') save(); }}
                />
                <button className="btn btn-primary" onClick={save} style={{ minWidth: 72, justifyContent: 'center' }}>
                    {saved ? <Check size={14} /> : 'Save'}
                </button>
            </div>
        </div>
    );
}
