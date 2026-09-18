/**
 * Follow the wallet host's network.
 *
 * When qRougee runs inside a RougeChain wallet host — the Qwalla in-app browser
 * or the browser extension — the *wallet* owns the active network. The user
 * shouldn't have to keep a second toggle here in sync: if Qwalla is on mainnet
 * the site should be on mainnet, and if Qwalla is on testnet the site should be
 * on testnet (the same public test node). Run standalone (no injected provider,
 * e.g. music.rougee.app in a plain browser), the site keeps its own
 * NetworkSwitcher untouched.
 *
 * Qwalla already exposes this: the injected `window.rougechain` provider answers
 * `getNetwork()` and fires a `networkChanged` event on every switch (see the
 * Qwalla dApp provider bridge). We just have to listen.
 *
 * Adopting a change reloads the page, because the SDK client is built once from
 * getApiBase() and cached page data is keyed to the old endpoint — a reload is
 * the same mechanism the manual NetworkSwitcher already uses. We reload only
 * when the mapped id actually differs from what's stored, so this can never loop.
 */
import { getNetworkId, setNetworkId, providerNetworkToSiteId } from './network';

interface WalletHostProvider {
    isRougeChain?: boolean;
    getNetwork?: () => Promise<{ network?: string } | undefined>;
    on?: (event: string, cb: (data: unknown) => void) => void;
}

function host(): WalletHostProvider | undefined {
    return (window as unknown as { rougechain?: WalletHostProvider }).rougechain;
}

function adopt(net: unknown): void {
    const mapped = providerNetworkToSiteId(net);
    if (!mapped) return;
    if (mapped === getNetworkId()) return; // already aligned — no reload
    setNetworkId(mapped);
    window.location.reload();
}

let wired = false;
function wire(provider: WalletHostProvider): void {
    if (wired) return;
    wired = true;
    // Follow future switches made in the wallet.
    provider.on?.('networkChanged', (data) => {
        adopt((data as { network?: string } | undefined)?.network);
    });
    // Align to the wallet's current network right now.
    provider.getNetwork?.().then((n) => adopt(n?.network)).catch(() => { /* not fatal */ });
}

/** Start following the wallet host's network. Safe to call once at startup. */
export function startProviderNetworkSync(): void {
    const now = host();
    if (now?.isRougeChain) wire(now);
    // The in-app browser injects the provider asynchronously — react to its ready event too.
    window.addEventListener('rougechain#initialized', () => {
        const p = host();
        if (p?.isRougeChain) wire(p);
    });
}
