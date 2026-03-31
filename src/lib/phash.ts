import sharp from 'sharp';

const HASH_SIZE = 8; // 8x8 = 64-bit hash

/**
 * Generate a perceptual hash (pHash) for an image buffer using DCT.
 * Returns a 16-character hex string (64 bits).
 */
export async function generatePHash(input: Buffer | Uint8Array): Promise<string> {
    // Resize to (HASH_SIZE * 4) for DCT, convert to greyscale
    const size = HASH_SIZE * 4;
    const raw = await sharp(Buffer.from(input))
        .resize(size, size, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer();

    // Build pixel matrix
    const pixels: number[][] = [];
    for (let y = 0; y < size; y++) {
        pixels[y] = [];
        for (let x = 0; x < size; x++) {
            pixels[y][x] = raw[y * size + x];
        }
    }

    // Apply 2D DCT
    const dct = applyDCT(pixels, size);

    // Take top-left HASH_SIZE x HASH_SIZE low frequencies
    const flat: number[] = [];
    for (let y = 0; y < HASH_SIZE; y++) {
        for (let x = 0; x < HASH_SIZE; x++) {
            flat.push(dct[y][x]);
        }
    }

    // Compute mean (excluding DC component at [0][0])
    const values = flat.slice(1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Build binary hash: 1 if value > mean, else 0
    const bits = flat.map(v => (v > mean ? 1 : 0));

    // Convert to hex
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
        const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
        hex += nibble.toString(16);
    }
    return hex;
}

/**
 * Hamming distance between two pHash hex strings.
 * Lower = more similar. 0 = identical. Threshold ≤ 10 = likely duplicate.
 */
export function hammingDistance(a: string, b: string): number {
    if (a.length !== b.length) return Infinity;
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
        const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
        dist += xor.toString(2).split('').filter(c => c === '1').length;
    }
    return dist;
}

function applyDCT(pixels: number[][], size: number): number[][] {
    const result: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
    const sqrt2 = Math.sqrt(2);

    for (let u = 0; u < size; u++) {
        for (let v = 0; v < size; v++) {
            let sum = 0;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    sum +=
                        Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
                        Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size)) *
                        pixels[y][x];
                }
            }
            const cu = u === 0 ? 1 / sqrt2 : 1;
            const cv = v === 0 ? 1 / sqrt2 : 1;
            result[u][v] = (cu * cv * sum * 2) / size;
        }
    }
    return result;
}
