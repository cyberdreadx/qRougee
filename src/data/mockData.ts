export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  coverUrl: string;
  audioUrl: string;
  genre: string;
  collectionId?: string;
  tokenId?: string;
  mintDate?: string;
  owner?: string;
}

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  trackCount: number;
}

export interface Collection {
  id: string;
  name: string;
  symbol: string;
  artist: string;
  coverUrl: string;
  tracks: Track[];
}

// Placeholder cover images using solid color SVGs
const cover = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="hsl(${hue},0%,${12 + hue % 20}%)"/><text x="200" y="210" text-anchor="middle" fill="hsl(0,0%,${60 + hue % 30}%)" font-family="sans-serif" font-size="48">${['♪', '♫', '♬', '♩'][hue % 4]}</text></svg>`
  )}`;

const avatar = (letter: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#171717"/><text x="100" y="115" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="72" font-weight="700">${letter}</text></svg>`
  )}`;

export const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Quantum Drift',
    artist: 'Nyx Protocol',
    album: 'Post-Quantum',
    duration: 234,
    coverUrl: cover(0),
    audioUrl: '',
    genre: 'Electronic',
    collectionId: 'col_001',
    tokenId: 'tok_001',
    mintDate: '2026-02-20',
    owner: 'rouge1qx7...a3f2',
  },
  {
    id: '2',
    title: 'Lattice Dreams',
    artist: 'Cipher Wave',
    album: 'Encrypted',
    duration: 198,
    coverUrl: cover(5),
    audioUrl: '',
    genre: 'Ambient',
    collectionId: 'col_002',
    tokenId: 'tok_002',
    mintDate: '2026-02-19',
    owner: 'rouge1mx4...b1e7',
  },
  {
    id: '3',
    title: 'Zero Knowledge',
    artist: 'Nyx Protocol',
    album: 'Post-Quantum',
    duration: 312,
    coverUrl: cover(10),
    audioUrl: '',
    genre: 'Electronic',
    collectionId: 'col_001',
    tokenId: 'tok_003',
    mintDate: '2026-02-18',
    owner: 'rouge1qx7...a3f2',
  },
  {
    id: '4',
    title: 'Dilithium Sun',
    artist: 'Block Phantom',
    album: 'Genesis',
    duration: 267,
    coverUrl: cover(15),
    audioUrl: '',
    genre: 'Synthwave',
    collectionId: 'col_003',
    tokenId: 'tok_004',
    mintDate: '2026-02-17',
    owner: 'rouge1tz9...d4c8',
  },
  {
    id: '5',
    title: 'Merkle Root',
    artist: 'Hash Garden',
    album: 'Trees',
    duration: 185,
    coverUrl: cover(20),
    audioUrl: '',
    genre: 'Lo-fi',
    collectionId: 'col_004',
    tokenId: 'tok_005',
    mintDate: '2026-02-16',
    owner: 'rouge1kv2...e5a1',
  },
  {
    id: '6',
    title: 'Consensus',
    artist: 'Validator Set',
    album: 'Epoch One',
    duration: 241,
    coverUrl: cover(25),
    audioUrl: '',
    genre: 'Techno',
    collectionId: 'col_005',
    tokenId: 'tok_006',
    mintDate: '2026-02-15',
    owner: 'rouge1rf8...f6b3',
  },
  {
    id: '7',
    title: 'Slashing Ceremony',
    artist: 'Validator Set',
    album: 'Epoch One',
    duration: 189,
    coverUrl: cover(30),
    audioUrl: '',
    genre: 'Techno',
    collectionId: 'col_005',
    tokenId: 'tok_007',
    mintDate: '2026-02-14',
    owner: 'rouge1rf8...f6b3',
  },
  {
    id: '8',
    title: 'Entropy Pool',
    artist: 'Cipher Wave',
    album: 'Encrypted',
    duration: 276,
    coverUrl: cover(35),
    audioUrl: '',
    genre: 'Ambient',
    collectionId: 'col_002',
    tokenId: 'tok_008',
    mintDate: '2026-02-13',
    owner: 'rouge1mx4...b1e7',
  },
  {
    id: '9',
    title: 'Finality',
    artist: 'Block Phantom',
    album: 'Genesis',
    duration: 203,
    coverUrl: cover(8),
    audioUrl: '',
    genre: 'Synthwave',
    collectionId: 'col_003',
    tokenId: 'tok_009',
    mintDate: '2026-02-12',
    owner: 'rouge1tz9...d4c8',
  },
  {
    id: '10',
    title: 'Staking Rewards',
    artist: 'Hash Garden',
    album: 'Trees',
    duration: 156,
    coverUrl: cover(18),
    audioUrl: '',
    genre: 'Lo-fi',
    collectionId: 'col_004',
    tokenId: 'tok_010',
    mintDate: '2026-02-11',
    owner: 'rouge1kv2...e5a1',
  },
  {
    id: '11',
    title: 'Bridge Protocol',
    artist: 'Nyx Protocol',
    album: 'Post-Quantum',
    duration: 290,
    coverUrl: cover(3),
    audioUrl: '',
    genre: 'Electronic',
    collectionId: 'col_001',
    tokenId: 'tok_011',
    mintDate: '2026-02-10',
    owner: 'rouge1qx7...a3f2',
  },
  {
    id: '12',
    title: 'AMM Sunrise',
    artist: 'Hash Garden',
    album: 'Trees',
    duration: 222,
    coverUrl: cover(22),
    audioUrl: '',
    genre: 'Lo-fi',
    collectionId: 'col_004',
    tokenId: 'tok_012',
    mintDate: '2026-02-09',
    owner: 'rouge1kv2...e5a1',
  },
];

export const MOCK_ARTISTS: Artist[] = [
  { id: 'a1', name: 'Nyx Protocol', avatarUrl: avatar('N'), trackCount: 3 },
  { id: 'a2', name: 'Cipher Wave', avatarUrl: avatar('C'), trackCount: 2 },
  { id: 'a3', name: 'Block Phantom', avatarUrl: avatar('B'), trackCount: 2 },
  { id: 'a4', name: 'Hash Garden', avatarUrl: avatar('H'), trackCount: 3 },
  { id: 'a5', name: 'Validator Set', avatarUrl: avatar('V'), trackCount: 2 },
];

export const GENRES = [
  'Electronic',
  'Ambient',
  'Synthwave',
  'Techno',
  'Lo-fi',
  'House',
  'Drum & Bass',
  'Downtempo',
];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
