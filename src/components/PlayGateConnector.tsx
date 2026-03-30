import { useEffect } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import * as ext from '../utils/extensionSigner';
import PlayGateModal from './PlayGateModal';

/**
 * Connects play gating to wallet + RougeChain SDK.
 * Must be rendered inside PlayerProvider, WalletProvider, and RougeChainProvider.
 */
export default function PlayGateConnector() {
    const { gatedTrack, dismissGate, setTokenBalanceChecker, setWalletPublicKey, setPlayRecorder } = usePlayer();
    const { publicKey, walletKeys, isExtensionWallet } = useWallet();
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
