/**
 * Pure PCM audio conversion helpers for the WebSocket audio relay fallback
 * when WebRTC P2P ICE cannot establish a direct UDP connection (e.g. symmetric NATs).
 */

export const RELAY_TARGET_SAMPLE_RATE = 16000;

/**
 * Downsamples mono Float32 PCM samples from inputSampleRate to targetSampleRate
 * using box-filter averaging and quantizes to signed 16-bit PCM.
 */
export function downsampleFloat32ToInt16(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate = RELAY_TARGET_SAMPLE_RATE
): Int16Array {
  if (input.length === 0) return new Int16Array(0);
  const safeInputRate = Math.max(8000, inputSampleRate);
  const safeTargetRate = Math.min(safeInputRate, Math.max(8000, targetSampleRate));

  if (safeTargetRate === safeInputRate) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    }
    return out;
  }

  const ratio = safeInputRate / safeTargetRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(outputLength);

  let offsetBuffer = 0;
  for (let i = 0; i < outputLength; i += 1) {
    const nextOffset = Math.min(input.length, Math.round((i + 1) * ratio));
    let accum = 0;
    let count = 0;
    for (let j = offsetBuffer; j < nextOffset; j += 1) {
      accum += input[j];
      count += 1;
    }
    const avg = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, avg));
    out[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    offsetBuffer = nextOffset;
  }

  return out;
}

/**
 * Encodes an Int16Array (little-endian) to a compact base64 string.
 */
export function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Decodes a base64-encoded little-endian Int16 PCM buffer into Float32 [-1, 1].
 */
export function base64ToFloat32(base64: string): Float32Array<ArrayBuffer> {
  let bytes: Uint8Array;
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } else {
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
  }
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  const out = new Float32Array(new ArrayBuffer(sampleCount * 4));
  for (let i = 0; i < sampleCount; i += 1) {
    const int16 = view.getInt16(i * 2, true);
    out[i] = int16 / 0x8000;
  }
  return out;
}

/**
 * Computes root-mean-square amplitude in [0, 1] for voice activity / level meters.
 */
export function computeRmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sumSq += samples[i] * samples[i];
  }
  return Math.sqrt(sumSq / samples.length);
}
