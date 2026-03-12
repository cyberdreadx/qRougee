import { useRef, useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TokenChartProps {
    symbol: string;
    currentPrice: number;
    poolReserveA: number;  // XRGE
    poolReserveB: number;  // Token
}

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

type Timeframe = '1H' | '4H' | '1D' | '1W';

/**
 * Generate simulated historical candle data from the current price.
 * Uses deterministic seeded randomness from the symbol to keep it stable across renders.
 */
function generateCandles(symbol: string, currentPrice: number, count: number, intervalMs: number): Candle[] {
    // Simple seed hash from symbol
    let seed = 0;
    for (let i = 0; i < symbol.length; i++) seed = ((seed << 5) - seed + symbol.charCodeAt(i)) | 0;
    const rng = () => { seed = (seed * 1664525 + 1013904223) | 0; return (seed >>> 0) / 4294967296; };

    const candles: Candle[] = [];
    const now = Date.now();
    let price = currentPrice * (0.5 + rng() * 0.5); // Start lower

    for (let i = 0; i < count; i++) {
        const volatility = 0.02 + rng() * 0.06;
        const drift = (currentPrice - price) * 0.01 + (rng() - 0.48) * volatility * price;
        const open = price;
        const close = Math.max(0.0001, price + drift);
        const high = Math.max(open, close) * (1 + rng() * volatility);
        const low = Math.min(open, close) * (1 - rng() * volatility);
        const volume = (100 + rng() * 900) * currentPrice;

        candles.push({
            time: now - (count - i) * intervalMs,
            open, high, low, close, volume,
        });
        price = close;
    }
    return candles;
}

export default function TokenChart({ symbol, currentPrice, poolReserveA, poolReserveB }: TokenChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [timeframe, setTimeframe] = useState<Timeframe>('1D');
    const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

    const intervals: Record<Timeframe, { ms: number; count: number }> = {
        '1H': { ms: 60_000, count: 60 },       // 1-min candles, 60 of them
        '4H': { ms: 5 * 60_000, count: 48 },   // 5-min candles
        '1D': { ms: 30 * 60_000, count: 48 },   // 30-min candles
        '1W': { ms: 4 * 3600_000, count: 42 },  // 4-hour candles
    };

    const candles = useMemo(
        () => generateCandles(symbol + timeframe, currentPrice, intervals[timeframe].count, intervals[timeframe].ms),
        [symbol, currentPrice, timeframe]
    );

    const priceChange = candles.length >= 2 ? candles[candles.length - 1].close - candles[0].open : 0;
    const priceChangePct = candles.length >= 2
        ? ((candles[candles.length - 1].close - candles[0].open) / candles[0].open * 100)
        : 0;
    const isPositive = priceChange >= 0;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || candles.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Hi-DPI support
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;

        // Clear
        ctx.clearRect(0, 0, W, H);

        const padding = { top: 10, right: 60, bottom: 30, left: 10 };
        const chartW = W - padding.left - padding.right;
        const chartH = H - padding.top - padding.bottom;

        const allHigh = Math.max(...candles.map(c => c.high));
        const allLow = Math.min(...candles.map(c => c.low));
        const range = allHigh - allLow || 1;

        const toX = (i: number) => padding.left + (i / (candles.length - 1)) * chartW;
        const toY = (price: number) => padding.top + (1 - (price - allLow) / range) * chartH;

        // Grid lines
        const gridLines = 5;
        ctx.strokeStyle = 'rgba(128,128,128,0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (i / gridLines) * chartH;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(W - padding.right, y);
            ctx.stroke();

            // Y-axis labels
            const val = allHigh - (i / gridLines) * range;
            ctx.fillStyle = 'rgba(128,128,128,0.5)';
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(val.toFixed(val < 1 ? 4 : 2), W - padding.right + 6, y + 3);
        }
        ctx.setLineDash([]);

        // Area fill under the close prices
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        if (isPositive) {
            gradient.addColorStop(0, 'rgba(34,197,94,0.25)');
            gradient.addColorStop(1, 'rgba(34,197,94,0)');
        } else {
            gradient.addColorStop(0, 'rgba(239,68,68,0.25)');
            gradient.addColorStop(1, 'rgba(239,68,68,0)');
        }

        ctx.beginPath();
        ctx.moveTo(toX(0), toY(candles[0].close));
        for (let i = 1; i < candles.length; i++) {
            ctx.lineTo(toX(i), toY(candles[i].close));
        }
        ctx.lineTo(toX(candles.length - 1), padding.top + chartH);
        ctx.lineTo(toX(0), padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Price line
        ctx.beginPath();
        ctx.moveTo(toX(0), toY(candles[0].close));
        for (let i = 1; i < candles.length; i++) {
            ctx.lineTo(toX(i), toY(candles[i].close));
        }
        ctx.strokeStyle = isPositive ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Candlestick bodies
        const candleW = Math.max(2, chartW / candles.length * 0.5);
        for (let i = 0; i < candles.length; i++) {
            const c = candles[i];
            const x = toX(i);
            const bullish = c.close >= c.open;
            const color = bullish ? '#22c55e' : '#ef4444';

            // Wick
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, toY(c.high));
            ctx.lineTo(x, toY(c.low));
            ctx.stroke();

            // Body
            const top = toY(Math.max(c.open, c.close));
            const bot = toY(Math.min(c.open, c.close));
            const bodyH = Math.max(1, bot - top);
            ctx.fillStyle = color;
            ctx.fillRect(x - candleW / 2, top, candleW, bodyH);
        }

        // Current price line
        const lastY = toY(currentPrice);
        ctx.strokeStyle = isPositive ? '#22c55e88' : '#ef444488';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, lastY);
        ctx.lineTo(W - padding.right, lastY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current price badge
        ctx.fillStyle = isPositive ? '#22c55e' : '#ef4444';
        const badgeW = 52;
        const badgeH = 18;
        const badgeX = W - padding.right;
        roundRect(ctx, badgeX, lastY - badgeH / 2, badgeW, badgeH, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(currentPrice.toFixed(currentPrice < 1 ? 4 : 2), badgeX + badgeW / 2, lastY + 4);

        // Volume bars at bottom
        const maxVol = Math.max(...candles.map(c => c.volume));
        const volH = chartH * 0.15;
        for (let i = 0; i < candles.length; i++) {
            const c = candles[i];
            const x = toX(i);
            const h = (c.volume / maxVol) * volH;
            const bullish = c.close >= c.open;
            ctx.fillStyle = bullish ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
            ctx.fillRect(x - candleW / 2, padding.top + chartH - h, candleW, h);
        }

        // Time axis labels
        ctx.fillStyle = 'rgba(128,128,128,0.5)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const labelCount = Math.min(6, candles.length);
        for (let i = 0; i < labelCount; i++) {
            const idx = Math.floor((i / (labelCount - 1)) * (candles.length - 1));
            const d = new Date(candles[idx].time);
            let label: string;
            if (timeframe === '1H' || timeframe === '4H') {
                label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            } else if (timeframe === '1D') {
                label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            } else {
                label = `${d.getMonth() + 1}/${d.getDate()}`;
            }
            ctx.fillText(label, toX(idx), H - 8);
        }

    }, [candles, currentPrice, isPositive, timeframe]);

    // Handle mouse hover for crosshair
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || candles.length === 0) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const padding = { left: 10, right: 60 };
        const chartW = rect.width - padding.left - padding.right;
        const idx = Math.round(((x - padding.left) / chartW) * (candles.length - 1));
        if (idx >= 0 && idx < candles.length) {
            setHoveredCandle(candles[idx]);
        }
    };

    const displayCandle = hoveredCandle || candles[candles.length - 1];

    return (
        <div className="token-chart">
            <div className="token-chart-header">
                <div className="token-chart-title">
                    <span className="token-chart-symbol">{symbol}/XRGE</span>
                    <span className="token-chart-price" style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
                        {currentPrice.toFixed(currentPrice < 1 ? 4 : 2)} XRGE
                    </span>
                    <span className={`token-chart-change ${isPositive ? 'up' : 'down'}`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isPositive ? '+' : ''}{priceChangePct.toFixed(2)}%
                    </span>
                </div>
                <div className="token-chart-timeframes">
                    {(['1H', '4H', '1D', '1W'] as Timeframe[]).map(tf => (
                        <button
                            key={tf}
                            className={`token-chart-tf${timeframe === tf ? ' active' : ''}`}
                            onClick={() => setTimeframe(tf)}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* OHLCV row */}
            {displayCandle && (
                <div className="token-chart-ohlcv">
                    <span>O <b>{displayCandle.open.toFixed(4)}</b></span>
                    <span>H <b>{displayCandle.high.toFixed(4)}</b></span>
                    <span>L <b>{displayCandle.low.toFixed(4)}</b></span>
                    <span>C <b>{displayCandle.close.toFixed(4)}</b></span>
                    <span>Vol <b>{displayCandle.volume.toFixed(0)}</b></span>
                </div>
            )}

            <div className="token-chart-canvas-wrap">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredCandle(null)}
                />
            </div>

            {/* Pool info */}
            <div className="token-chart-pool">
                <span>Pool Reserves:</span>
                <span>{poolReserveA.toLocaleString()} XRGE</span>
                <span>·</span>
                <span>{poolReserveB.toLocaleString()} {symbol}</span>
            </div>

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
                .token-chart-timeframes {
                    display: flex;
                    gap: 2px;
                    background: var(--bg);
                    border-radius: 6px;
                    padding: 2px;
                }
                .token-chart-tf {
                    background: none;
                    border: none;
                    color: var(--fg-muted);
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .token-chart-tf.active {
                    background: var(--surface);
                    color: var(--fg);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .token-chart-tf:hover:not(.active) {
                    color: var(--fg);
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
