import { useEffect } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import { useNftTracks } from '../hooks/useNftTracks';
import type { Track } from '../data/mockData';
import * as ext from '../utils/extensionSigner';
import PlayGateModal from './PlayGateModal';

function shuffled<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Connects play gating to wallet + RougeChain SDK.
 * Must be rendered inside PlayerProvider, WalletProvider, and RougeChainProvider.
 */
export default function PlayGateConnector() {
    const { gatedTrack, dismissGate, setTokenBalanceChecker, setWalletPublicKey, setPlayRecorder, setRadioProvider } = usePlayer();
    const { publicKey, walletKeys, isExtensionWallet } = useWallet();
    const rc = useRougeChain();
    const { tracks } = useNftTracks();

    // Autoplay/radio source: when the queue runs out, continue with related
    // tracks — same artist first, then same genre, then anything else — drawn
    // from the (collectible-free, de-duped) listener feed.
    useEffect(() => {
        setRadioProvider((current: Track | null, exclude: Set<string>) => {
            const pool = tracks.filter(t => t.id !== current?.id && !exclude.has(t.id));
            if (pool.length === 0) return [];
            const sameArtist = pool.filter(t => current && t.artist === current.artist);
            const sameGenre = pool.filter(t =>
                current && t.genre && t.genre !== 'Unknown' &&
                t.genre === current.genre && t.artist !== current.artist);
            const picked = new Set([...sameArtist, ...sameGenre]);
            const rest = pool.filter(t => !picked.has(t));
            return [...shuffled(sameArtist), ...shuffled(sameGenre), ...shuffled(rest)].slice(0, 20);
        });
    }, [tracks, setRadioProvider]);

    // Inject wallet public key into player
    useEffect(() => {
        setWalletPublicKey(publicKey || null);
    }, [publicKey, setWalletPublicKey]);

    // Inject token balance checker into player
    useEffect(() => {
        setTokenBalanceChecker(async (wallet: string, symbol: string) => {
            try {
                const bal = await rc.getTokenBalance(wallet, symbol);
                return bal || 0;
            } catch {
                return 0;
            }
        });
    }, [rc, setTokenBalanceChecker]);

    useEffect(() => {
        if (!walletKeys) return;
        setPlayRecorder((trackId: string) => {
            if (isExtensionWallet) {
                ext.socialRecordPlay(walletKeys.publicKey, trackId).catch(() => {});
            } else {
                rc.social.recordPlay(walletKeys, trackId).catch(() => {});
            }
        });
    }, [rc, walletKeys, isExtensionWallet, setPlayRecorder]);

    // Render gate modal if needed
    if (!gatedTrack) return null;

    return (
        <PlayGateModal
            track={gatedTrack.track}
            playCount={gatedTrack.playCount}
            maxFree={gatedTrack.maxFree}
            tokenBalance={gatedTrack.tokenBalance}
            requiredBalance={gatedTrack.requiredBalance}
            onClose={dismissGate}
        />
    );
}
