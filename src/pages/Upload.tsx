import { useState } from 'react';
import { Upload as UploadIcon, Music, CheckCircle, Loader } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

interface MintForm {
    title: string;
    artist: string;
    genre: string;
    description: string;
}

export default function UploadPage() {
    const { isConnected, connect, balance } = useWallet();
    const [form, setForm] = useState<MintForm>({
        title: '',
        artist: '',
        genre: '',
        description: '',
    });
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [isMinting, setIsMinting] = useState(false);
    const [mintSuccess, setMintSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.artist) return;

        setIsMinting(true);
        // Simulate minting process
        await new Promise(r => setTimeout(r, 2500));
        setIsMinting(false);
        setMintSuccess(true);
    };

    if (!isConnected) {
        return (
            <div className="page-container">
                <div className="empty-state" style={{ paddingTop: 120 }}>
                    <UploadIcon />
                    <h3>Connect your wallet</h3>
                    <p style={{ marginBottom: 20 }}>
                        Connect to mint your tracks as NFTs on RougeChain.
                    </p>
                    <button className="btn btn-primary" onClick={connect}>
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    if (mintSuccess) {
        return (
            <div className="page-container">
                <div className="mint-success">
                    <CheckCircle />
                    <h3>Track Minted Successfully</h3>
                    <p style={{ marginBottom: 4 }}>
                        "{form.title}" by {form.artist} is now live on RougeChain.
                    </p>
                    <p style={{ marginBottom: 20 }}>
                        Collection created • NFT minted • Metadata stored on-chain
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setMintSuccess(false);
                                setForm({ title: '', artist: '', genre: '', description: '' });
                                setCoverFile(null);
                                setAudioFile(null);
                            }}
                        >
                            Mint Another
                        </button>
                        <a href="/" className="btn btn-secondary">
                            Go Home
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 style={{ marginBottom: 8 }}>Mint a Track</h1>
            <p className="text-muted" style={{ marginBottom: 32 }}>
                Create an NFT collection and mint your track on RougeChain. Cost: ~0.5
                XRGE • Balance: {balance} XRGE
            </p>

            <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
                {/* Audio Upload */}
                <div className="form-group">
                    <label className="form-label">Audio File</label>
                    <div
                        className="upload-area"
                        onClick={() =>
                            document.getElementById('audio-upload')?.click()
                        }
                    >
                        <Music />
                        <p>
                            <strong>Click to upload</strong> or drag and drop
                        </p>
                        <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                            {audioFile ? audioFile.name : 'MP3, WAV, FLAC up to 50MB'}
                        </p>
                    </div>
                    <input
                        id="audio-upload"
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={e => setAudioFile(e.target.files?.[0] || null)}
                    />
                </div>

                {/* Cover Art Upload */}
                <div className="form-group">
                    <label className="form-label">Cover Art</label>
                    <div
                        className="upload-area"
                        onClick={() =>
                            document.getElementById('cover-upload')?.click()
                        }
                        style={{ padding: 24 }}
                    >
                        <UploadIcon />
                        <p>
                            {coverFile ? coverFile.name : 'Upload cover image (1:1 recommended)'}
                        </p>
                    </div>
                    <input
                        id="cover-upload"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => setCoverFile(e.target.files?.[0] || null)}
                    />
                </div>

                {/* Title */}
                <div className="form-group">
                    <label className="form-label">Track Title *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter track title"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        required
                    />
                </div>

                {/* Artist */}
                <div className="form-group">
                    <label className="form-label">Artist Name *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter artist name"
                        value={form.artist}
                        onChange={e => setForm({ ...form, artist: e.target.value })}
                        required
                    />
                </div>

                {/* Genre */}
                <div className="form-group">
                    <label className="form-label">Genre</label>
                    <select
                        className="form-input"
                        value={form.genre}
                        onChange={e => setForm({ ...form, genre: e.target.value })}
                    >
                        <option value="">Select a genre</option>
                        <option value="Electronic">Electronic</option>
                        <option value="Ambient">Ambient</option>
                        <option value="Synthwave">Synthwave</option>
                        <option value="Techno">Techno</option>
                        <option value="Lo-fi">Lo-fi</option>
                        <option value="House">House</option>
                        <option value="Drum & Bass">Drum & Bass</option>
                        <option value="Downtempo">Downtempo</option>
                    </select>
                </div>

                {/* Description */}
                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                        className="form-input"
                        placeholder="Tell listeners about this track..."
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        rows={3}
                    />
                </div>

                {/* Chain Info */}
                <div className="chain-info" style={{ marginBottom: 24 }}>
                    <div className="chain-info-title">Transaction Details</div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Network</span>
                        <span className="chain-info-value">RougeChain Testnet</span>
                    </div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Action</span>
                        <span className="chain-info-value">
                            createCollection + mint
                        </span>
                    </div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Est. Cost</span>
                        <span className="chain-info-value">~0.5 XRGE</span>
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isMinting || !form.title || !form.artist}
                    style={{ width: '100%', padding: '12px 20px' }}
                >
                    {isMinting ? (
                        <>
                            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Minting on RougeChain...
                        </>
                    ) : (
                        'Mint Track as NFT'
                    )}
                </button>
                <p
                    className="text-xs text-muted"
                    style={{ textAlign: 'center', marginTop: 8 }}
                >
                    By minting, you confirm ownership of this content.
                </p>
            </form>

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
