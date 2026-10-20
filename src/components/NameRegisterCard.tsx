import { useState, useEffect } from 'react';
import { AtSign, Check, Loader } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import { clearArtistNameCache } from '../utils/artistName';

/**
 * Register an on-chain RougeChain name for the connected wallet. Once set, the
 * identity resolver (ArtistName) shows it on the creator's tracks instead of a
 * hex handle. Local wallets only — the extension bridge has no names method.
 */
export default function NameRegisterCard() {
    const { walletKeys, isExtensionWallet } = useWallet();
    const rc = useRougeChain();
    const [current, setCurrent] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (!walletKeys?.publicKey) return;
        let cancelled = false;
        rc.mail.reverseLookup(walletKeys.publicKey)
            .then(n => { if (!cancelled) setCurrent(n); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [walletKeys, rc]);

    // Only local wallets can register (SDK needs the private key; the extension
    // bridge exposes no names method).
    if (!walletKeys || isExtensionWallet) return null;

    const register = async () => {
        const n = name.trim().toLowerCase();
        if (!n || busy) return;
        setBusy(true); setMsg(null);
        try {
            const res = await rc.mail.registerName(walletKeys, n, walletKeys.publicKey);
            if (res.success) {
                clearArtistNameCache(walletKeys.publicKey);
                setCurrent(n);
                setName('');
                setMsg({ ok: true, text: `Registered “${n}” — it’ll show as your artist name on your tracks.` });
            } else {
                setMsg({ ok: false, text: (res as { error?: string }).error || 'That name may be taken. Try another.' });
            }
        } catch (e) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'Registration failed' });
        }
        setBusy(false);
    };

    return (
        <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AtSign size={16} /> <strong>On-chain name</strong>
                {current && <span className="badge" style={{ marginLeft: 6 }}>@{current}</span>}
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                Claim a readable name on RougeChain. It replaces your hex handle across the app
                (and anywhere else your wallet appears). {current ? 'Registering a new one replaces it.' : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, maxWidth: 440 }}>
                <input
                    className="form-input"
                    placeholder="yourname"
                    value={name}
                    onChange={e => setName(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter') register(); }}
                />
                <button className="btn btn-primary" onClick={register} disabled={busy || !name.trim()} style={{ minWidth: 96, justifyContent: 'center' }}>
                    {busy ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : current ? 'Update' : 'Register'}
                </button>
            </div>
            {msg && (
                <p style={{ marginTop: 10, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, color: msg.ok ? '#16a34a' : '#dc2626' }}>
                    {msg.ok && <Check size={14} />} {msg.text}
                </p>
            )}
        </div>
    );
}
