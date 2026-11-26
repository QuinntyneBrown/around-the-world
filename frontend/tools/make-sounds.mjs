// Makes the game's three sounds (docs/adr/0029-motion-and-sound.md) from sine tones with a soft
// attack and an exponential fall, so they are licence-clean and can be remade at any time, or
// replaced by recorded sounds at the same paths. Run from frontend/: `npm run sounds`.
//
// - sounds/pop.wav: one 80 ms tone falling from 880 Hz to 660 Hz, at a quarter of full loudness
//   (a key of the number pad);
// - sounds/chime.wav: two notes, C6 then E6, over 400 ms, at a third (a correct answer);
// - sounds/jingle.wav: four rising notes, C5, E5, G5 and C6, over 750 ms, at a third (a new
//   country).
//
// 16-bit mono WAV at 16 kHz: small, and played by every browser the game is built for.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '../projects/game/public/sounds');
const RATE = 16000;
/** A note that rises in 5 ms and falls away; its partial an octave up softens the sine. */
const ATTACK_S = 0.005;

/** The samples of notes laid over each other: each starts at `at` seconds. */
function render(seconds, notes) {
  const samples = new Float64Array(Math.round(seconds * RATE));
  for (const { at, hz, to = hz, length, loudness, fall } of notes) {
    const start = Math.round(at * RATE);
    const count = Math.min(Math.round(length * RATE), samples.length - start);
    let phase = 0;
    for (let i = 0; i < count; i++) {
      const t = i / RATE;
      const pitch = hz + ((to - hz) * i) / count;
      phase += (2 * Math.PI * pitch) / RATE;
      const envelope = Math.min(1, t / ATTACK_S) * Math.exp(-t / fall);
      // The last 5 ms fade to silence, so no note ends with a click.
      const tail = Math.min(1, (count - i) / (ATTACK_S * RATE));
      const tone = Math.sin(phase) + 0.25 * Math.sin(2 * phase);
      samples[start + i] += (loudness * envelope * tail * tone) / 1.25;
    }
  }
  return samples;
}

/** A 16-bit PCM mono WAV file of the samples. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, i) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    data.writeInt16LE(Math.round(clipped * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.51;

const sounds = {
  pop: render(0.08, [{ at: 0, hz: 880, to: 660, length: 0.08, loudness: 0.25, fall: 0.025 }]),
  chime: render(0.4, [
    { at: 0, hz: C6, length: 0.4, loudness: 0.33, fall: 0.12 },
    { at: 0.1, hz: E6, length: 0.3, loudness: 0.33, fall: 0.12 },
  ]),
  jingle: render(
    0.75,
    [C5, E5, G5, C6].map((hz, index) => ({
      at: index * 0.12,
      hz,
      length: 0.75 - index * 0.12,
      loudness: 0.33,
      fall: index === 3 ? 0.18 : 0.08,
    })),
  ),
};

mkdirSync(out, { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  const file = join(out, `${name}.wav`);
  writeFileSync(file, wav(samples));
  console.log(`${file}: ${(samples.length / RATE).toFixed(2)} s`);
}
