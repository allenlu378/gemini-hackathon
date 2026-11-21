import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64ToFloat32,
  computeRmsLevel,
  downsampleFloat32ToInt16,
  int16ToBase64,
} from './audioRelay';

test('downsampleFloat32ToInt16 reduces 48kHz PCM to 16kHz with clamping', () => {
  const input = new Float32Array(480);
  for (let i = 0; i < input.length; i += 1) {
    input[i] = i < 240 ? 0.5 : -1.5; // second half tests clamp to -1.0
  }
  const out = downsampleFloat32ToInt16(input, 48000, 16000);
  assert.equal(out.length, 160);
  assert.ok(out[10] > 15000 && out[10] < 17000);
  assert.equal(out[150], -32768);
});

test('int16ToBase64 and base64ToFloat32 round-trip PCM audio accurately', () => {
  const original = new Int16Array([-32768, -16384, 0, 16384, 32767]);
  const encoded = int16ToBase64(original);
  const decoded = base64ToFloat32(encoded);
  assert.equal(decoded.length, original.length);
  assert.ok(Math.abs(decoded[0] - -1.0) < 0.001);
  assert.ok(Math.abs(decoded[1] - -0.5) < 0.001);
  assert.equal(decoded[2], 0);
  assert.ok(Math.abs(decoded[3] - 0.5) < 0.001);
  assert.ok(Math.abs(decoded[4] - 1.0) < 0.001);
});

test('computeRmsLevel returns 0 for silence and accurate amplitude for steady tone', () => {
  assert.equal(computeRmsLevel(new Float32Array(128)), 0);
  const half = new Float32Array(128).fill(0.5);
  assert.ok(Math.abs(computeRmsLevel(half) - 0.5) < 0.0001);
});
