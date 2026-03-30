export interface RoyaltySplit {
  artist: number;
  tokenHolders: number;
  collaborators: number;
  platform: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  genre: string;
  collectionId?: string;
  tokenId?: string;
  mintDate?: string;
  owner?: string;
  creator?: string;
  tokenSymbol?: string;
  tokenSupply?: number;
  royaltySplit?: RoyaltySplit;
  playGateThreshold?: number;
  premiumThreshold?: number;
}

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  trackCount: number;
  bio: string;
  walletAddress: string;
  listeners: number;
  verified: boolean;
}

export interface Collection {
  id: string;
  name: string;
  symbol: string;
  artist: string;
  coverUrl: string;
  tracks: Track[];
}

// No mock data — tracks come from on-chain NFT queries
export const MOCK_TRACKS: Track[] = [];

export const MOCK_ARTISTS: Artist[] = [];

export const GENRES = [
  'Hip-Hop',
  'R&B',
  'Pop',
  'Rock',
  'Electronic',
  'House',
  'Techno',
  'Drum & Bass',
  'Dubstep',
  'Trap',
  'Lo-fi',
  'Ambient',
  'Synthwave',
  'Downtempo',
  'Jazz',
  'Soul',
  'Funk',
  'Reggae',
  'Dancehall',
  'Afrobeats',
  'Latin',
  'Reggaeton',
  'Country',
  'Folk',
  'Indie',
  'Alternative',
  'Metal',
  'Punk',
  'Classical',
  'Gospel',
  'K-Pop',
  'Phonk',
  'Jersey Club',
  'Amapiano',
  'Drill',
  'Experimental',
  'Soundtrack',
  'Spoken Word',
  'Other',
];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
