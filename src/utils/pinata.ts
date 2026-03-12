const PINATA_API = 'https://api.pinata.cloud';

/** Returns auth headers — supports JWT or API key+secret */
function getAuthHeaders(): Record<string, string> {
    const jwt = import.meta.env.VITE_PINATA_JWT;
    if (jwt && jwt !== 'your_pinata_jwt_here' && jwt.includes('.')) {
        return { Authorization: `Bearer ${jwt}` };
    }

    const apiKey = import.meta.env.VITE_PINATA_API_KEY;
    const apiSecret = import.meta.env.VITE_PINATA_API_SECRET;
    if (apiKey && apiSecret) {
        return {
            pinata_api_key: apiKey,
            pinata_secret_api_key: apiSecret,
        };
    }

    throw new Error(
        'Pinata credentials not set. Add either VITE_PINATA_JWT or VITE_PINATA_API_KEY + VITE_PINATA_API_SECRET to .env',
    );
}

function getGateway(): string {
    let gw = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
    // Normalize: ensure https:// prefix
    if (!gw.startsWith('http')) gw = `https://${gw}`;
    // Ensure /ipfs suffix for dedicated gateways
    if (!gw.includes('/ipfs')) gw = `${gw}/ipfs`;
    return gw;
}

/** Upload a single File to Pinata and return the IPFS CID + gateway URL */
export async function pinFile(
    file: File,
    name?: string,
    keyvalues?: Record<string, string>,
): Promise<{ cid: string; url: string }> {
    const headers = getAuthHeaders();
    const body = new FormData();
    body.append('file', file);

    const meta: Record<string, unknown> = {};
    if (name) meta.name = name;
    if (keyvalues) meta.keyvalues = keyvalues;
    if (Object.keys(meta).length > 0) {
        body.append('pinataMetadata', JSON.stringify(meta));
    }

    const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers,
        body,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pinata upload failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    const cid: string = data.IpfsHash;
    return { cid, url: `${getGateway()}/${cid}` };
}

/** Upload a JSON object to Pinata and return the IPFS CID + gateway URL */
export async function pinJson(
    json: Record<string, unknown>,
    name?: string,
    keyvalues?: Record<string, string>,
): Promise<{ cid: string; url: string }> {
    const headers = getAuthHeaders();

    const meta: Record<string, unknown> = {};
    if (name) meta.name = name;
    if (keyvalues) meta.keyvalues = keyvalues;

    const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            pinataContent: json,
            pinataMetadata: Object.keys(meta).length > 0 ? meta : undefined,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pinata JSON upload failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    const cid: string = data.IpfsHash;
    return { cid, url: `${getGateway()}/${cid}` };
}

/**
 * Upload multiple files as a single IPFS folder/directory.
 * Each file is placed at the given path within the directory.
 * Returns the directory CID — individual files are at `<dirCID>/<filename>`.
 *
 * Example:
 *   pinFolder('My Track', [
 *     { path: 'audio.mp3', file: audioFile },
 *     { path: 'cover.png', file: coverFile },
 *   ])
 *   → { cid: 'Qm...', url: 'https://gateway.pinata.cloud/ipfs/Qm...' }
 *   → audio at: url + '/audio.mp3'
 *   → cover at: url + '/cover.png'
 */
export async function pinFolder(
    folderName: string,
    files: { path: string; file: File }[],
    keyvalues?: Record<string, string>,
): Promise<{ cid: string; url: string; fileUrl: (path: string) => string }> {
    const headers = getAuthHeaders();
    const body = new FormData();

    for (const { path, file } of files) {
        // Pinata wraps files in a directory when each file has a path like `folderName/filename`
        body.append('file', file, `${folderName}/${path}`);
    }

    const meta: Record<string, unknown> = { name: folderName };
    if (keyvalues) meta.keyvalues = keyvalues;
    body.append('pinataMetadata', JSON.stringify(meta));

    body.append(
        'pinataOptions',
        JSON.stringify({ wrapWithDirectory: true }),
    );

    const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers,
        body,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pinata folder upload failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    const cid: string = data.IpfsHash;
    const gateway = getGateway();
    const baseUrl = `${gateway}/${cid}/${folderName}`;

    return {
        cid,
        url: baseUrl,
        fileUrl: (path: string) => `${baseUrl}/${path}`,
    };
}
