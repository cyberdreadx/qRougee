declare module '@rougechain/sdk' {
    export interface WalletKeys {
        publicKey: string;
        privateKey: string;
        mnemonic?: string;
    }

    export interface NftCollection {
        collection_id: string;
        symbol: string;
        name: string;
        creator: string;
        image?: string;
        max_supply?: number;
        royalty_bps?: number;
        description?: string;
    }

    export interface NftToken {
        collection_id: string;
        token_id: string;
        name: string;
        owner: string;
        creator?: string;
        metadata_uri?: string;
        image?: string;
        attributes?: Record<string, unknown>;
        minted_at?: number;
        [key: string]: unknown;
    }

    export interface PriceSnapshot {
        timestamp: number;
        price: number;
        price_a_in_b: number;
        price_b_in_a: number;
        reserve_a: number;
        reserve_b: number;
        [key: string]: unknown;
    }

    export function bytesToHex(bytes: Uint8Array): string;
    export function hexToBytes(hex: string): Uint8Array;

    export class RougeChain {
        constructor(baseUrl: string);

        getBalance(publicKey: string): Promise<{ balance: number }>;
        getTokens(): Promise<Record<string, unknown>[]>;
        getTokenBalance(publicKey: string, symbol: string): Promise<number>;
        getTransactions(opts?: { limit?: number }): Promise<unknown>;
        transfer(keys: WalletKeys, opts: { to: string; amount: number; token?: string }): Promise<{ success: boolean; error?: string; data?: unknown }>;
        createToken(keys: WalletKeys, opts: { name: string; symbol: string; totalSupply: number; image?: string }): Promise<{ success: boolean; error?: string; data?: unknown }>;
        faucet(keys: WalletKeys): Promise<unknown>;

        nft: {
            getCollections(): Promise<NftCollection[]>;
            getCollection(id: string): Promise<NftCollection>;
            getTokens(collectionId: string, opts?: { limit?: number }): Promise<{ tokens: NftToken[] } & NftToken[]>;
            getByOwner(publicKey: string): Promise<NftToken[]>;
            createCollection(keys: WalletKeys, opts: { symbol: string; name: string; maxSupply: number; royaltyBps: number; description?: string; image?: string }): Promise<{ success: boolean; error?: string; data?: unknown }>;
            waitForCollection(id: string, opts?: { timeoutMs?: number; pollMs?: number }): Promise<void>;
            mint(keys: WalletKeys, opts: { collectionId: string; name: string; metadataUri: string; attributes?: Record<string, unknown> }): Promise<{ success: boolean; error?: string; data?: unknown }>;
        };

        dex: {
            getPools(): Promise<Record<string, unknown>[]>;
            getPool(poolId: string): Promise<Record<string, unknown>>;
            getPriceHistory(poolId: string): Promise<PriceSnapshot[]>;
            quote(opts: { poolId: string; tokenIn: string; tokenOut: string; amountIn: number }): Promise<unknown>;
            swap(keys: WalletKeys, opts: { tokenIn: string; tokenOut: string; amountIn: number; minAmountOut: number }): Promise<{ success: boolean; error?: string; data?: unknown }>;
            createPool(keys: WalletKeys, opts: { tokenA: string; tokenB: string; amountA: number; amountB: number }): Promise<{ success: boolean; error?: string; data?: unknown }>;
        };

        social: {
            recordPlay(wallet: WalletKeys, trackId: string): Promise<{ success: boolean; error?: string; plays?: number }>;
            toggleLike(wallet: WalletKeys, trackId: string): Promise<{ success: boolean; error?: string; liked?: boolean; likes?: number }>;
            postComment(wallet: WalletKeys, trackId: string, body: string): Promise<{ success: boolean; error?: string; comment?: SocialComment }>;
            deleteComment(wallet: WalletKeys, commentId: string): Promise<{ success: boolean; error?: string }>;
            toggleFollow(wallet: WalletKeys, artistPubkey: string): Promise<{ success: boolean; error?: string; following?: boolean; followers?: number }>;
            getTrackStats(trackId: string, viewerPubkey?: string): Promise<TrackStats>;
            getComments(trackId: string, limit?: number, offset?: number): Promise<SocialComment[]>;
            getArtistStats(pubkey: string, viewerPubkey?: string): Promise<ArtistStats>;
            getUserLikes(pubkey: string): Promise<string[]>;
            getUserFollowing(pubkey: string): Promise<string[]>;

            createPost(wallet: WalletKeys, body: string, replyToId?: string): Promise<{ success: boolean; error?: string; post?: SocialPost }>;
            deletePost(wallet: WalletKeys, postId: string): Promise<{ success: boolean; error?: string }>;
            toggleRepost(wallet: WalletKeys, postId: string): Promise<{ success: boolean; error?: string; reposted?: boolean; reposts?: number }>;
            getPost(postId: string, viewerPubkey?: string): Promise<{ post: SocialPost; stats: PostStats } | null>;
            getPostStats(postId: string, viewerPubkey?: string): Promise<PostStats>;
            getPostReplies(postId: string, limit?: number, offset?: number): Promise<SocialPost[]>;
            getUserPosts(pubkey: string, limit?: number, offset?: number): Promise<{ posts: SocialPost[]; total: number }>;
            getGlobalTimeline(limit?: number, offset?: number): Promise<SocialPost[]>;
            getFollowingFeed(wallet: WalletKeys, limit?: number, offset?: number): Promise<SocialPost[]>;
        };
    }

    export interface TrackStats {
        plays: number;
        likes: number;
        commentCount: number;
        liked: boolean;
    }

    export interface ArtistStats {
        followers: number;
        following: number;
        isFollowing: boolean;
    }

    export interface SocialComment {
        id: string;
        track_id: string;
        wallet_pubkey: string;
        body: string;
        timestamp: string;
    }

    export interface SocialPost {
        id: string;
        author_pubkey: string;
        body: string;
        reply_to_id: string | null;
        created_at: string;
    }

    export interface PostStats {
        likes: number;
        reposts: number;
        replies: number;
        liked: boolean;
        reposted: boolean;
    }
}
