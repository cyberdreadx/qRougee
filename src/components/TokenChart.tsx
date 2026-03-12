import { useRef, useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Loader } from 'lucide-react';
import { useRougeChain } from '../hooks/useRougeChain';
import type { PriceSnapshot } from '@rougechain/sdk';

interface TokenChartProps {
    symbol: string;
    poolId: string;
    /** Is the song token tokenA in the pool? */
    isTokenA: boolean;
}

export default function TokenChart({ symbol, poolId, isTokenA }: TokenChartProps) {
    const rc = useRougeChain();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [snapshots, setSnapshots] = useState<PriceSnapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const fetchPrices = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rc.dex.getPriceHistory(poolId);
            setSnapshots(Array.isArray(data) ? data : []);
        } catch {
            setSnapshots([]);
        } finally {
            setLoading(false);
        }
    }, [rc, poolId]);

    useEffect(() => { fetchPrices(); }, [fetchPrices]);

    // Price = how much XRGE per token
    // If token is tokenA: price_a_in_b = how many B (XRGE) per A (token)
    // If token is tokenB: price_b_in_a = how many A (XRGE) per B (token)
    const prices = snapshots.map(s => ({
        time: s.timestamp,
        price: isTokenA ? s.price_a_in_b : s.price_b_in_a,
        reserveXRGE: isTokenA ? s.reserve_b : s.reserve_a,
        reserveToken: isTokenA ? s.reserve_a : s.reserve_b,
    }));

    const currentPrice = prices.length > 0 ? prices[prices.length - 1].price : 0;
    const firstPrice = prices.length > 0 ? prices[0].price : 0;
    const priceChange = currentPrice - firstPrice;
    const priceChangePct = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
    const isPositive = priceChange >= 0;

    const hovered = hoveredIdx !== null && hoveredIdx < prices.length ? prices[hoveredIdx] : null;
    const displayPrice = hovered ? hovered.price : currentPrice;

    // Draw chart
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || prices.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;

        ctx.clearRect(0, 0, W, H);

        const pad = { top: 10, right: 55, bottom: 28, left: 10 };
        const chartW = W - pad.left - pad.right;
        const chartH = H - pad.top - pad.bottom;

        const allPrices = prices.map(p => p.price);
        const maxP = Math.max(...allPrices);
        const minP = Math.min(...allPrices);
        const range = maxP - minP || 1;

        const toX = (i: number) => pad.left + (i / (prices.length - 1)) * chartW;
        const toY = (p: number) => pad.top + (1 - (p - minP) / range) * chartH;

        // Grid
        ctx.strokeStyle = 'rgba(128,128,128,0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        for (let g = 0; g <= 4; g++) {
            const y = pad.top + (g / 4) * chartH;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
            const val = maxP - (g / 4) * range;
            ctx.fillStyle = 'rgba(128,128,128,0.5)';
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(val.toFixed(val < 1 ? 4 : 2), W - pad.right + 5, y + 3);
        }
        ctx.setLineDash([]);

        // Area fill
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
        const color = isPositive ? '34,197,94' : '239,68,68';
        grad.addColorStop(0, `rgba(${color},0.25)`);
        grad.addColorStop(1, `rgba(${color},0)`);

        ctx.beginPath();
        ctx.moveTo(toX(0), toY(prices[0].price));
        for (let i = 1; i < prices.length; i++) ctx.lineTo(toX(i), toY(prices[i].price));
        ctx.lineTo(toX(prices.length - 1), pad.top + chartH);
        ctx.lineTo(toX(0), pad.top + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Price line
        ctx.beginPath();
        ctx.moveTo(toX(0), toY(prices[0].price));
        for (let i = 1; i < prices.length; i++) ctx.lineTo(toX(i), toY(prices[i].price));
        ctx.strokeStyle = isPositive ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dots at each data point
        for (let i = 0; i < prices.length; i++) {
            ctx.beginPath();
            ctx.arc(toX(i), toY(prices[i].price), 3, 0, Math.PI * 2);
            ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444';
            ctx.fill();
        }

        // Current price dashed line
        const lastY = toY(currentPrice);
        ctx.strokeStyle = `rgba(${color},0.5)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(pad.left, lastY); ctx.lineTo(W - pad.right, lastY); ctx.stroke();
        ctx.setLineDash([]);

        // Current price badge
        ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444';
        roundRect(ctx, W - pad.right, lastY - 9, 50, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(currentPrice.toFixed(currentPrice < 1 ? 4 : 2), W - pad.right + 25, lastY + 4);

        // Hover crosshair
        if (hoveredIdx !== null && hoveredIdx < prices.length) {
            const hx = toX(hoveredIdx);
            const hy = toY(prices[hoveredIdx].price);
            ctx.strokeStyle = 'rgba(128,128,128,0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(hx, pad.top); ctx.lineTo(hx, pad.top + chartH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad.left, hy); ctx.lineTo(W - pad.right, hy); ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(hx, hy, 5, 0, Math.PI * 2);
            ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Time labels
        ctx.fillStyle = 'rgba(128,128,128,0.5)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const labels = Math.min(5, prices.length);
        for (let i = 0; i < labels; i++) {
            const idx = Math.floor((i / (labels - 1)) * (prices.length - 1));
            const d = new Date(prices[idx].time * 1000);
            const label = `${(d.getMonth() + 1)}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            ctx.fillText(label, toX(idx), H - 6);
        }

    }, [prices, currentPrice, isPositive, hoveredIdx]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || prices.length < 2) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pad = { left: 10, right: 55 };
        const chartW = rect.width - pad.left - pad.right;
        const idx = Math.round(((x - pad.left) / chartW) * (prices.length - 1));
        setHoveredIdx(Math.max(0, Math.min(prices.length - 1, idx)));
    };

    return (
        <div className="token-chart">
            <div className="token-chart-header">
                <div className="token-chart-title">
                    <span className="token-chart-symbol">{symbol}/XRGE</span>
                    {prices.length > 0 && (
                        <>
                            <span className="token-chart-price" style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
                                {displayPrice.toFixed(displayPrice < 1 ? 4 : 2)} XRGE
                            </span>
                            <span className={`token-chart-change ${isPositive ? 'up' : 'down'}`}>
                                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {isPositive ? '+' : ''}{priceChangePct.toFixed(2)}%
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Hovered snapshot info */}
            {hovered && (
                <div className="token-chart-ohlcv">
                    <span>Price <b>{hovered.price.toFixed(4)}</b></span>
                    <span>Pool <b>{hovered.reserveXRGE.toLocaleString()} XRGE</b></span>
                    <span>· <b>{hovered.reserveToken.toLocaleString()} {symbol}</b></span>
                    <span>{new Date(hovered.time * 1000).toLocaleString()}</span>
                </div>
            )}

            <div className="token-chart-canvas-wrap">
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                        <Loader size={20} className="spin" style={{ opacity: 0.4 }} />
                    </div>
                ) : prices.length < 2 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, flexDirection: 'column', gap: 8 }}>
                        <TrendingUp size={24} style={{ opacity: 0.2 }} />
                        <span className="text-sm text-muted">Not enough price history yet</span>
                        <span className="text-xs text-muted">Chart will populate as trades happen</span>
                    </div>
                ) : (
                    <canvas
                        ref={canvasRef}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHoveredIdx(null)}
                    />
                )}
            </div>

            {/* Current pool state */}
            {prices.length > 0 && (
                <div className="token-chart-pool">
                    <span>{prices.length} price snapshot{prices.length !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>Latest: {prices[prices.length - 1].reserveXRGE.toLocaleString()} XRGE / {prices[prices.length - 1].reserveToken.toLocaleString()} {symbol}</span>
                </div>
            )}

            <style>{`
                .token-chart {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    margin-bottom: 20px;
                }
                .token-chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 16px 6px;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .token-chart-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .token-chart-symbol {
                    font-weight: 700;
                    font-size: 1rem;
                }
                .token-chart-price {
                    font-weight: 600;
                    font-size: 0.95rem;
                }
                .token-chart-change {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 2px 8px;
                    border-radius: 4px;
                }
                .token-chart-change.up {
                    color: #22c55e;
                    background: rgba(34, 197, 94, 0.12);
                }
                .token-chart-change.down {
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.12);
                }
                .token-chart-ohlcv {
                    display: flex;
                    gap: 12px;
                    padding: 4px 16px 6px;
                    font-size: 0.68rem;
                    color: var(--fg-muted);
                    flex-wrap: wrap;
                }
                .token-chart-ohlcv b {
                    color: var(--fg);
                    margin-left: 2px;
                }
                .token-chart-canvas-wrap {
                    padding: 0 4px;
                }
                .token-chart-canvas-wrap canvas {
                    width: 100%;
                    height: 220px;
                    cursor: crosshair;
                }
                .token-chart-pool {
                    display: flex;
                    gap: 8px;
                    padding: 8px 16px;
                    font-size: 0.7rem;
                    color: var(--fg-muted);
                    border-top: 1px solid var(--border);
                    flex-wrap: wrap;
                }
                @media (max-width: 600px) {
                    .token-chart-canvas-wrap canvas {
                        height: 180px;
                    }
                    .token-chart-header {
                        padding: 10px 12px 4px;
                    }
                    .token-chart-ohlcv {
                        gap: 8px;
                        font-size: 0.62rem;
                    }
                }
            `}</style>
        </div>
    );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
