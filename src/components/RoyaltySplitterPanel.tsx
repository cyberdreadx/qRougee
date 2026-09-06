import { useState } from 'react';
import { Coins, Plus, Trash2, Rocket, Send, Copy } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { getApiBase } from '../config/network';
import { deploySplitter, distribute, type Payee } from '../utils/royaltySplitter';

/**
 * On-chain royalty splitter (RougeChain v2). Configure collaborators + shares,
 * deploy a splitter contract, use its address as the NFT royalty recipient, and
 * distribute accrued royalties trustlessly with one call.
 */
export default function RoyaltySplitterPanel() {
    const { isConnected, publicKey } = useWallet();
    const [payees, setPayees] = useState<Payee[]>([
        { address: '', weight: 50 },
        { address: '', weight: 50 },
    ]);
    const [deploying, setDeploying] = useState(false);
    const [distributing, setDistributing] = useState(false);
    const [splitterAddr, setSplitterAddr] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const total = payees.reduce((s, p) => s + (Number(p.weight) || 0), 0);
    const canDeploy =
        isConnected &&
        payees.length > 0 &&
        total > 0 &&
        payees.every((p) => p.address.trim() !== '' && Number(p.weight) > 0);

    const setPayee = (i: number, patch: Partial<Payee>) =>
        setPayees((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    const addPayee = () => setPayees((ps) => [...ps, { address: '', weight: 0 }]);
    const removePayee = (i: number) => setPayees((ps) => ps.filter((_, idx) => idx !== i));

    const onDeploy = async () => {
        if (!publicKey) return;
        setDeploying(true);
        setError(null);
        setStatus(null);
        try {
            const { address } = await deploySplitter(
                getApiBase(),
                publicKey,
                payees.map((p) => ({ address: p.address.trim(), weight: Math.trunc(Number(p.weight)) })),
            );
            setSplitterAddr(address);
            setStatus('Splitter deployed. Set this address as your NFT royalty recipient.');
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setDeploying(false);
        }
    };

    const onDistribute = async () => {
        if (!splitterAddr || !publicKey) return;
        setDistributing(true);
        setError(null);
        setStatus(null);
        try {
            const r = await distribute(getApiBase(), splitterAddr, publicKey);
            setStatus(r.success ? 'Royalties distributed on-chain.' : r.error || 'Nothing to distribute.');
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setDistributing(false);
        }
    };

    return (
        <div className="royalty-stat-card" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Coins size={18} />
                <h3 style={{ margin: 0 }}>On-chain royalty splitter</h3>
            </div>
            <p className="text-muted" style={{ marginTop: 0 }}>
                Deploy a contract that holds royalties and pays collaborators by share, trustlessly (v2).
            </p>

            {!isConnected && <p className="text-muted">Connect your wallet to deploy a splitter.</p>}

            {isConnected && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {payees.map((p, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    className="input"
                                    style={{ flex: 1 }}
                                    placeholder="Collaborator address"
                                    value={p.address}
                                    onChange={(e) => setPayee(i, { address: e.target.value })}
                                />
                                <input
                                    className="input"
                                    style={{ width: 90 }}
                                    type="number"
                                    min={0}
                                    placeholder="share"
                                    value={p.weight}
                                    onChange={(e) => setPayee(i, { weight: Number(e.target.value) })}
                                />
                                <button
                                    className="btn btn-ghost"
                                    aria-label="Remove"
                                    onClick={() => removePayee(i)}
                                    disabled={payees.length <= 1}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <button className="btn btn-ghost" onClick={addPayee}>
                            <Plus size={16} /> Add collaborator
                        </button>
                        <span className="text-muted">Total shares: {total}</span>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: 12, width: '100%' }}
                        disabled={!canDeploy || deploying}
                        onClick={onDeploy}
                    >
                        <Rocket size={16} /> {deploying ? 'Deploying…' : 'Deploy splitter'}
                    </button>

                    {splitterAddr && (
                        <div style={{ marginTop: 12 }}>
                            <div className="text-muted">Splitter address (use as royalty recipient):</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <code style={{ wordBreak: 'break-all', flex: 1 }}>{splitterAddr}</code>
                                <button
                                    className="btn btn-ghost"
                                    aria-label="Copy"
                                    onClick={() => navigator.clipboard?.writeText(splitterAddr)}
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                            <button
                                className="btn btn-secondary"
                                style={{ marginTop: 8, width: '100%' }}
                                disabled={distributing}
                                onClick={onDistribute}
                            >
                                <Send size={16} /> {distributing ? 'Distributing…' : 'Distribute royalties now'}
                            </button>
                        </div>
                    )}

                    {status && <p style={{ color: 'var(--success, #16a34a)', marginTop: 8 }}>{status}</p>}
                    {error && <p style={{ color: 'var(--error, #dc2626)', marginTop: 8 }}>{error}</p>}
                </>
            )}
        </div>
    );
}
