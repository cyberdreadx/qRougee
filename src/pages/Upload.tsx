import { useState, useMemo } from 'react';
import {
    Upload as UploadIcon, Music, CheckCircle, Loader, AlertCircle,
    ChevronRight, ChevronLeft, Coins, Settings, Send
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import { pinFolder, pinJson } from '../utils/pinata';
import { type RoyaltySplit, GENRES } from '../data/mockData';

interface MintForm {
    // Step 1 — Upload
    title: string;
    artist: string;
    genre: string;
    ticker: string;
    description: string;
    collaborators: string;
    // Step 2 — Tokenomics
    tokenSupply: number;
    royaltySplit: RoyaltySplit;
    playGateThreshold: number;
    premiumThreshold: number;
}

const STEPS = ['Upload', 'Mint NFT', 'Tokenomics', 'Publish'];

export default function UploadPage() {
    const { isConnected, connect, balance, walletKeys } = useWallet();
    const rc = useRougeChain();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<MintForm>({
        title: '',
        artist: '',
        genre: '',
        ticker: '',
        description: '',        collaborators: '',
        tokenSupply: 1_000_000,
        royaltySplit: { artist: 60, tokenHolders: 25, collaborators: 10, platform: 5 },
        playGateThreshold: 50,
        premiumThreshold: 250,
    });
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [isMinting, setIsMinting] = useState(false);
    const [mintSuccess, setMintSuccess] = useState(false);
    const [mintError, setMintError] = useState<string | null>(null);
    const [mintResult, setMintResult] = useState<{
        collectionId?: string;
        tokenId?: string;
        tokenSymbol?: string;
    }>({});
    const [mintStep, setMintStep] = useState('');

    // Preview URLs (freed when file changes)
    const audioPreviewUrl = useMemo(() => {
        if (!audioFile) return '';
        return URL.createObjectURL(audioFile);
    }, [audioFile]);

    const coverPreviewUrl = useMemo(() => {
        if (!coverFile) return '';
        return URL.createObjectURL(coverFile);
    }, [coverFile]);

    const updateSplit = (key: keyof RoyaltySplit, value: number) => {
        setForm(prev => ({
            ...prev,
            royaltySplit: { ...prev.royaltySplit, [key]: value },
        }));
    };

    const splitTotal =
        form.royaltySplit.artist +
        form.royaltySplit.tokenHolders +
        form.royaltySplit.collaborators +
        form.royaltySplit.platform;

    const canProceed = () => {
        if (step === 0) return !!form.title && !!form.artist;
        if (step === 2) return splitTotal === 100;
        return true;
    };

    const handlePublish = async () => {
        if (!walletKeys) return;
        setIsMinting(true);
        setMintError(null);

        try {
            const tokenSymbol = (form.ticker || form.title)
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase()
                .slice(0, 10) || 'TRACK';

            // Collection symbol (derived from title, max 8 chars)
            const collectionSymbol = form.title
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase()
                .slice(0, 8) || 'TRACK';

            // Step 1: Upload audio + cover to IPFS as a folder
            setMintStep('Uploading assets to IPFS...');
            const pinataTags = {
                artist: form.artist,
                genre: form.genre || 'Unknown',
                type: 'track-assets',
                wallet: walletKeys.publicKey,
                symbol: tokenSymbol,
            };

            const folderFiles: { path: string; file: File }[] = [];
            if (audioFile) {
                const ext = audioFile.name.split('.').pop() || 'mp3';
                folderFiles.push({ path: `audio.${ext}`, file: audioFile });
            }
            if (coverFile) {
                const ext = coverFile.name.split('.').pop() || 'png';
                folderFiles.push({ path: `cover.${ext}`, file: coverFile });
            }

            let audioIpfsUrl = '';
            let coverIpfsUrl = '';

            if (folderFiles.length > 0) {
                const folder = await pinFolder(
                    `${form.artist} — ${form.title}`,
                    folderFiles,
                    pinataTags,
                );
                if (audioFile) {
                    const ext = audioFile.name.split('.').pop() || 'mp3';
                    audioIpfsUrl = folder.fileUrl(`audio.${ext}`);
                }
                if (coverFile) {
                    const ext = coverFile.name.split('.').pop() || 'png';
                    coverIpfsUrl = folder.fileUrl(`cover.${ext}`);
                }
            }

            // Step 2: Pin NFT metadata JSON to IPFS
            setMintStep('Pinning metadata to IPFS...');
            const metadata: Record<string, unknown> = {
                name: form.title,
                artist: form.artist,
                genre: form.genre,
                description: form.description,
                collaborators: form.collaborators,
                image: coverIpfsUrl,
                animation_url: audioIpfsUrl,
                audioUrl: audioIpfsUrl,
                coverUrl: coverIpfsUrl,
                tokenSymbol,
                tokenSupply: form.tokenSupply,
                royaltySplit: form.royaltySplit,
                playGateThreshold: form.playGateThreshold,
                premiumThreshold: form.premiumThreshold,
            };
            const metadataPin = await pinJson(
                metadata,
                `${form.artist} — ${form.title} (metadata)`,
                { ...pinataTags, type: 'track-metadata' },
            );

            // Step 3: Create NFT Collection on-chain
            setMintStep('Creating master NFT collection...');
            const createResult = await rc.nft.createCollection(walletKeys, {
                symbol: collectionSymbol,
                name: `${form.title} — ${form.artist}`,
                maxSupply: 1,
                royaltyBps: form.royaltySplit.artist * 100,
                description: form.description || `Track: ${form.title} by ${form.artist}`,
                image: coverIpfsUrl || undefined,
            });

            if (!createResult.success) {
                throw new Error(createResult.error || 'Failed to create collection');
            }

            const collectionId =
                (createResult.data as { collection_id?: string })?.collection_id || collectionSymbol;

            // Step 4: Wait for collection to be mined, then mint
            setMintStep('Waiting for collection to confirm...');
            await rc.nft.waitForCollection(collectionId, { timeoutMs: 30_000, pollMs: 1_000 });

            setMintStep('Minting master NFT...');
            const mintRes = await rc.nft.mint(walletKeys, {
                collectionId,
                name: form.title,
                metadataUri: metadataPin.url,
                attributes: metadata,
            });

            if (!mintRes.success) {
                throw new Error(mintRes.error || 'Failed to mint token');
            }

            // Step 5: Create the song token (fractionalization)
            setMintStep('Creating song token...');

            const tokenResult = await rc.createToken(walletKeys, {
                name: `${form.title} Token`,
                symbol: tokenSymbol,
                totalSupply: form.tokenSupply,
                image: coverIpfsUrl || undefined,
            });

            if (!tokenResult.success) {
                throw new Error(tokenResult.error || 'Failed to create song token');
            }

            // Step 6: Create DEX liquidity pool so the token is immediately tradeable
            setMintStep('Creating liquidity pool...');
            try {
                // Seed pool with 10% of total supply + proportional XRGE
                const poolTokens = Math.floor(form.tokenSupply * 0.1);
                const poolXrge = Math.max(10, Math.floor(poolTokens / 1000)); // 1 XRGE per 1000 tokens
                await rc.dex.createPool(walletKeys, {
                    tokenA: 'XRGE',
                    tokenB: tokenSymbol,
                    amountA: poolXrge,
                    amountB: poolTokens,
                });
            } catch {
                // Pool creation is non-critical — token still works without it
                console.warn('Pool creation failed — token is live but not yet tradeable');
            }

            setMintResult({ collectionId, tokenId: '1', tokenSymbol });
            setIsMinting(false);
            setMintSuccess(true);
        } catch (err) {
            setIsMinting(false);
            setMintError(
                err instanceof Error
                    ? err.message
                    : 'Transaction failed — check your balance and try again'
            );
        }
    };

    // ── Not connected ──────────────────────────────────────────────
    if (!isConnected) {
        return (
            <div className="page-container">
                <div className="empty-state" style={{ paddingTop: 120 }}>
                    <UploadIcon />
                    <h3>Connect your wallet</h3>
                    <p style={{ marginBottom: 20 }}>
                        Connect to mint your tracks as NFTs on RougeChain and create song tokens.
                    </p>
                    <button className="btn btn-primary" onClick={connect}>
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    // ── Success ────────────────────────────────────────────────────
    if (mintSuccess) {
        return (
            <div className="page-container">
                <div className="mint-success">
                    <CheckCircle />
                    <h3>Track Published Successfully</h3>
                    <p style={{ marginBottom: 4 }}>
                        "{form.title}" by {form.artist} is now live on RougeChain.
                    </p>
                    <div className="chain-info" style={{ margin: '20px 0', textAlign: 'left' }}>
                        <div className="chain-info-row">
                            <span className="chain-info-label">Master NFT</span>
                            <span className="chain-info-value">{mintResult.collectionId} #{mintResult.tokenId}</span>
                        </div>
                        <div className="chain-info-row">
                            <span className="chain-info-label">Song Token</span>
                            <span className="chain-info-value">{mintResult.tokenSymbol} ({form.tokenSupply.toLocaleString()} supply)</span>
                        </div>
                        <div className="chain-info-row">
                            <span className="chain-info-label">Royalty Split</span>
                            <span className="chain-info-value">
                                {form.royaltySplit.artist}% artist · {form.royaltySplit.tokenHolders}% holders · {form.royaltySplit.collaborators}% collabs · {form.royaltySplit.platform}% platform
                            </span>
                        </div>
                        <div className="chain-info-row">
                            <span className="chain-info-label">Play Gate</span>
                            <span className="chain-info-value">Hold {form.playGateThreshold} {mintResult.tokenSymbol} for unlimited</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setMintSuccess(false);
                                setMintResult({});
                                setStep(0);
                                setForm({
                                    title: '', artist: '', genre: '', ticker: '', description: '', collaborators: '',
                                    tokenSupply: 1_000_000,
                                    royaltySplit: { artist: 60, tokenHolders: 25, collaborators: 10, platform: 5 },
                                    playGateThreshold: 50,
                                    premiumThreshold: 250,
                                });
                                setCoverFile(null);
                                setAudioFile(null);
                            }}
                        >
                            Mint Another
                        </button>
                        <a href="/" className="btn btn-secondary">Go Home</a>
                    </div>
                </div>
            </div>
        );
    }

    // ── Wizard ─────────────────────────────────────────────────────
    return (
        <div className="page-container">
            <h1 style={{ marginBottom: 8 }}>Mint a Track</h1>
            <p className="text-muted" style={{ marginBottom: 24 }}>
                Upload → Mint Master NFT → Configure Tokenomics → Publish · Balance: {balance} XRGE
            </p>

            {/* Step Progress */}
            <div className="wizard-steps">
                {STEPS.map((label, i) => (
                    <div key={label} className={`wizard-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
                        <div className="wizard-step-num">{i < step ? '✓' : i + 1}</div>
                        <span className="wizard-step-label">{label}</span>
                        {i < STEPS.length - 1 && <div className="wizard-step-line" />}
                    </div>
                ))}
            </div>

            {mintError && (
                <div className="mint-error" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', marginBottom: 24,
                    background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: 'var(--radius)', color: '#f87171', fontSize: '0.875rem',
                }}>
                    <AlertCircle size={16} />
                    {mintError}
                </div>
            )}

            <div style={{ maxWidth: 600 }}>
                {/* ── Step 0: Upload ─────────────────────────── */}
                {step === 0 && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Audio File</label>
                            <div className="upload-area" onClick={() => document.getElementById('audio-upload')?.click()}>
                                <Music />
                                <p><strong>Click to upload</strong> or drag and drop</p>
                                <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                                    {audioFile ? audioFile.name : 'MP3, WAV, FLAC up to 50MB'}
                                </p>
                            </div>
                            <input id="audio-upload" type="file" accept=".mp3,.wav,.flac,.aac,.ogg,.m4a,.wma" style={{ display: 'none' }}
                                onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                            {audioFile && (
                                <div className="audio-preview" style={{ marginTop: 8 }}>
                                    <audio
                                        controls
                                        src={audioPreviewUrl}
                                        style={{ width: '100%', height: 40, borderRadius: 'var(--radius)' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cover Art</label>
                            <div className="upload-area" onClick={() => document.getElementById('cover-upload')?.click()}
                                style={{ padding: 24 }}>
                                {coverPreviewUrl ? (
                                    <img
                                        src={coverPreviewUrl}
                                        alt="Cover preview"
                                        style={{
                                            width: 120, height: 120, objectFit: 'cover',
                                            borderRadius: 'var(--radius)', marginBottom: 8,
                                        }}
                                    />
                                ) : (
                                    <UploadIcon />
                                )}
                                <p>{coverFile ? coverFile.name : 'Upload cover image (1:1 recommended)'}</p>
                            </div>
                            <input id="cover-upload" type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Track Title *</label>
                            <input type="text" className="form-input" placeholder="Enter track title"
                                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Artist Name *</label>
                            <input type="text" className="form-input" placeholder="Enter artist name"
                                value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} required />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Song Ticker
                                <span className="text-xs text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                                    (like a stock symbol for your track)
                                </span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" className="form-input"
                                    placeholder={form.title
                                        ? `Will use: ${(form.title).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'TRACK'}`
                                        : 'Enter title first...'}
                                    value={form.ticker}
                                    onChange={e => setForm({ ...form, ticker: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) })}
                                    maxLength={8}
                                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                />
                            </div>
                            <p className="text-xs text-muted" style={{ marginTop: 6, lineHeight: 1.4 }}>
                                A short unique name for your song on-chain. Think stock tickers:
                                <strong> MOONBEAT</strong>, <strong>NEONDRP</strong>, <strong>VIBES</strong>.
                                {!form.ticker && form.title && (
                                    <span> Leave blank to use <strong>
                                        {form.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'TRACK'}
                                    </strong>.</span>
                                )}
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Genre</label>
                            <select className="form-input" value={form.genre}
                                onChange={e => setForm({ ...form, genre: e.target.value })}>
                                <option value="">Select a genre</option>
                                {GENRES.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Collaborators</label>
                            <input type="text" className="form-input" placeholder="Comma-separated wallet addresses"
                                value={form.collaborators} onChange={e => setForm({ ...form, collaborators: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-input" placeholder="Tell listeners about this track..."
                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                        </div>
                    </>
                )}

                {/* ── Step 1: Mint NFT Review ───────────────── */}
                {step === 1 && (
                    <>
                        <h3 style={{ marginBottom: 16 }}>
                            <Settings size={18} style={{ verticalAlign: -3, marginRight: 6 }} />
                            Master NFT Preview
                        </h3>
                        <div className="chain-info" style={{ marginBottom: 24 }}>
                            <div className="chain-info-title">Transaction Details</div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Network</span>
                                <span className="chain-info-value">RougeChain Testnet</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Action</span>
                                <span className="chain-info-value">createCollection + mint</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Song</span>
                                <span className="chain-info-value">{form.title} — {form.artist}</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">NFT Type</span>
                                <span className="chain-info-value">1-of-1 Master Rights NFT</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Signature</span>
                                <span className="chain-info-value">ML-DSA-65 (post-quantum)</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Audio</span>
                                <span className="chain-info-value">{audioFile ? audioFile.name : 'None'}</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Cover</span>
                                <span className="chain-info-value">{coverFile ? coverFile.name : 'None'}</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Est. Cost</span>
                                <span className="chain-info-value">~0.5 XRGE</span>
                            </div>
                        </div>
                        <p className="text-sm text-muted">
                            This NFT represents the master ownership and royalty rights for this track.
                            It will be minted to your wallet and can be used to configure tokenomics.
                        </p>
                    </>
                )}

                {/* ── Step 2: Tokenomics Config ─────────────── */}
                {step === 2 && (
                    <>
                        <h3 style={{ marginBottom: 16 }}>
                            <Coins size={18} style={{ verticalAlign: -3, marginRight: 6 }} />
                            Configure Song Tokenomics
                        </h3>

                        <div className="form-group">
                            <label className="form-label">Token Ticker</label>
                            <input type="text" className="form-input"
                                value={form.ticker}
                                onChange={e => setForm({ ...form, ticker: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) })}
                                placeholder={(form.title || 'TRACK').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}
                                maxLength={10} />
                            <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                                The on-chain ticker for your song token (e.g. STRESS, MOONLIGHT). Max 10 characters.
                                {!form.ticker && form.title && (
                                    <span> Default: <strong>{form.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}</strong></span>
                                )}
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Total Token Supply</label>
                            <input type="number" className="form-input"
                                value={form.tokenSupply}
                                onChange={e => setForm({ ...form, tokenSupply: parseInt(e.target.value) || 0 })}
                                min={1000} max={100_000_000} />
                            <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                                Song tokens represent fractional participation in this track's ecosystem.
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Royalty Split {splitTotal !== 100 && (
                                    <span style={{ color: '#f87171', marginLeft: 8 }}>
                                        (total: {splitTotal}% — must equal 100%)
                                    </span>
                                )}
                            </label>
                            <div className="split-grid">
                                <div className="split-item">
                                    <label className="text-xs">Artist %</label>
                                    <input type="number" className="form-input" min={0} max={100}
                                        value={form.royaltySplit.artist}
                                        onChange={e => updateSplit('artist', parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="split-item">
                                    <label className="text-xs">Token Holders %</label>
                                    <input type="number" className="form-input" min={0} max={100}
                                        value={form.royaltySplit.tokenHolders}
                                        onChange={e => updateSplit('tokenHolders', parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="split-item">
                                    <label className="text-xs">Collaborators %</label>
                                    <input type="number" className="form-input" min={0} max={100}
                                        value={form.royaltySplit.collaborators}
                                        onChange={e => updateSplit('collaborators', parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="split-item">
                                    <label className="text-xs">Platform %</label>
                                    <input type="number" className="form-input" min={0} max={100}
                                        value={form.royaltySplit.platform}
                                        onChange={e => updateSplit('platform', parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            {/* Visual bar */}
                            {splitTotal === 100 && (
                                <div className="split-bar">
                                    <div style={{ width: `${form.royaltySplit.artist}%`, background: 'var(--accent)' }}
                                        title={`Artist ${form.royaltySplit.artist}%`} />
                                    <div style={{ width: `${form.royaltySplit.tokenHolders}%`, background: '#8b5cf6' }}
                                        title={`Holders ${form.royaltySplit.tokenHolders}%`} />
                                    <div style={{ width: `${form.royaltySplit.collaborators}%`, background: '#06b6d4' }}
                                        title={`Collabs ${form.royaltySplit.collaborators}%`} />
                                    <div style={{ width: `${form.royaltySplit.platform}%`, background: '#64748b' }}
                                        title={`Platform ${form.royaltySplit.platform}%`} />
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Play Gate (tokens required for unlimited streaming)</label>
                            <input type="number" className="form-input"
                                value={form.playGateThreshold}
                                onChange={e => setForm({ ...form, playGateThreshold: parseInt(e.target.value) || 0 })}
                                min={0} />
                            <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                                First 3 plays are free. Users need this many tokens for unlimited plays. Set 0 to disable.
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Premium Access (tokens for exclusive content)</label>
                            <input type="number" className="form-input"
                                value={form.premiumThreshold}
                                onChange={e => setForm({ ...form, premiumThreshold: parseInt(e.target.value) || 0 })}
                                min={0} />
                            <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                                Hold this many tokens to unlock stems, remixes, and behind-the-scenes content.
                            </p>
                        </div>
                    </>
                )}

                {/* ── Step 3: Publish ───────────────────────── */}
                {step === 3 && (
                    <>
                        <h3 style={{ marginBottom: 16 }}>
                            <Send size={18} style={{ verticalAlign: -3, marginRight: 6 }} />
                            Ready to Publish
                        </h3>
                        <div className="chain-info" style={{ marginBottom: 24 }}>
                            <div className="chain-info-title">Summary</div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Track</span>
                                <span className="chain-info-value">{form.title} — {form.artist}</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Genre</span>
                                <span className="chain-info-value">{form.genre || 'Unset'}</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Token Supply</span>
                                <span className="chain-info-value">{form.tokenSupply.toLocaleString()}</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Royalties</span>
                                <span className="chain-info-value">
                                    {form.royaltySplit.artist}% artist · {form.royaltySplit.tokenHolders}% holders · {form.royaltySplit.collaborators}% collabs · {form.royaltySplit.platform}% platform
                                </span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Play Gate</span>
                                <span className="chain-info-value">
                                    {form.playGateThreshold > 0 ? `${form.playGateThreshold} tokens` : 'Disabled'}
                                </span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Transactions</span>
                                <span className="chain-info-value">createCollection + mint + createToken</span>
                            </div>
                            <div className="chain-info-row">
                                <span className="chain-info-label">Est. Cost</span>
                                <span className="chain-info-value">~1.5 XRGE (3 transactions)</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            disabled={isMinting}
                            onClick={handlePublish}
                            style={{ width: '100%', padding: '14px 20px' }}
                        >
                            {isMinting ? (
                                <>
                                    <Loader size={16} className="spin" />
                                    {mintStep}
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Publish to RougeChain
                                </>
                            )}
                        </button>
                        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
                            By publishing, you confirm ownership of this content. All transactions signed with ML-DSA-65.
                        </p>
                    </>
                )}

                {/* ── Navigation ─────────────────────────────── */}
                {step < 3 && (
                    <div className="wizard-nav">
                        {step > 0 && (
                            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}
                        <div style={{ flex: 1 }} />
                        <button
                            className="btn btn-primary"
                            disabled={!canProceed()}
                            onClick={() => setStep(s => s + 1)}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin { animation: spin 1s linear infinite; }
            `}</style>

            {/* Upload Progress Overlay */}
            {isMinting && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
                        padding: '48px 40px', textAlign: 'center', maxWidth: 400, width: '90%',
                        border: '1px solid var(--border)',
                    }}>
                        <Loader size={40} className="spin" style={{ color: 'var(--fg)', marginBottom: 20 }} />
                        <h3 style={{ marginBottom: 8 }}>Publishing to RougeChain</h3>
                        <p className="text-muted" style={{ marginBottom: 20, fontSize: '0.875rem' }}>{mintStep}</p>
                        <div style={{
                            height: 4, borderRadius: 2, background: 'var(--border)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', background: 'var(--fg)', borderRadius: 2,
                                animation: 'progress-indeterminate 1.5s ease-in-out infinite',
                                width: '40%',
                            }} />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes progress-indeterminate {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }
            `}</style>
        </div>
    );
}
