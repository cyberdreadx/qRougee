import { useEffect } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import PlayGateModal from './PlayGateModal';

/**
 * Connects play gating to wallet + RougeChain SDK.
 * Must be rendered inside PlayerProvider, WalletProvider, and RougeChainProvider.
 */
export default function PlayGateConnector() {
    const { gatedTrack, dismissGate, setTokenBalanceChecker, setWalletPublicKey } = usePlayer();
    const { publicKey } = useWallet();
    const rc = useRougeChain();

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
