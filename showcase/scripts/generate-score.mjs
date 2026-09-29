import fs from "node:fs";
import path from "node:path";

// Original, deterministic 60-second score: restrained ambient synth, pulse,
// percussion, and transition swells. No third-party music samples are used.
const sampleRate = 44100;
const seconds = 60;
const channels = 2;
const frames = sampleRate * seconds;
const dataLength = frames * channels * 2;
const wav = Buffer.alloc(44 + dataLength);
wav.write("RIFF", 0);
wav.writeUInt32LE(36 + dataLength, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(channels, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * channels * 2, 28);
wav.writeUInt16LE(channels * 2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(dataLength, 40);

const chords = [
  [146.83, 174.61, 220.0],  // D minor
  [116.54, 146.83, 174.61], // B-flat major
  [174.61, 220.0, 261.63],  // F major
  [130.81, 164.81, 196.0], // C major
];
const roots = [73.42, 58.27, 87.31, 65.41];
const transitions = [0, 8, 18, 29, 39, 48, 56];
const tau = Math.PI * 2;
let randomState = 20260924;

for (let i = 0; i < frames; i += 1) {
  const t = i / sampleRate;
  const chordIndex = Math.floor(t / 8) % chords.length;
  const chord = chords[chordIndex];
  randomState = (Math.imul(randomState, 1664525) + 1013904223) | 0;
  const noise = (randomState >>> 0) / 2147483648 - 1;
  const density = t < 8 ? 0.42 : t < 18 ? 0.68 : t < 52 ? 1 : 0.7;

  const pad = chord.reduce((sum, frequency, index) =>
    sum + Math.sin(tau * frequency * t + index * 0.7) * (0.024 + 0.006 * Math.sin(tau * 0.08 * t + index)), 0);
  const shimmer = Math.sin(tau * chord[2] * 2 * t) * 0.009 * (0.5 + 0.5 * Math.sin(tau * 0.13 * t));

  const pulsePhase = t % 1;
  const bass = t > 5 && t < 56
    ? Math.sin(tau * roots[chordIndex] * t) * Math.exp(-pulsePhase * 5.5) * 0.115 * density
    : 0;
  const kick = t > 14 && t < 55
    ? Math.sin(tau * (45 + 32 * Math.exp(-pulsePhase * 20)) * pulsePhase) * Math.exp(-pulsePhase * 18) * 0.12 * density
    : 0;

  const eighthPhase = t % 0.25;
  const arpStep = Math.floor(t / 0.25) % 8;
  const arpFrequency = chord[[0, 1, 2, 1, 2, 1, 0, 1][arpStep]] * 2;
  const arp = t > 8 && t < 56
    ? Math.sin(tau * arpFrequency * t) * Math.exp(-eighthPhase * 18) * 0.024 * density
    : 0;
  const hat = t > 18 && t < 55 ? noise * Math.exp(-eighthPhase * 45) * 0.013 : 0;
  const snarePhase = (t + 0.5) % 1;
  const snare = t > 25 && t < 54 ? noise * Math.exp(-snarePhase * 28) * 0.024 : 0;

  let transitionSound = 0;
  for (const point of transitions) {
    const distance = t - point;
    if (distance > -0.55 && distance < 0) {
      const rise = (distance + 0.55) / 0.55;
      transitionSound += noise * rise * rise * 0.035;
    } else if (distance >= 0 && distance < 0.9) {
      transitionSound += Math.sin(tau * 54 * distance) * Math.exp(-distance * 7) * 0.09;
    }
  }

  const fadeIn = Math.min(1, t / 1.5);
  const fadeOut = Math.min(1, (60 - t) / 2.8);
  const envelope = Math.max(0, fadeIn * fadeOut);
  const center = (pad + shimmer + bass + kick + arp + hat + snare + transitionSound) * envelope;
  const left = Math.tanh(center * 1.35 + pad * 0.09);
  const right = Math.tanh(center * 1.35 - pad * 0.09);
  wav.writeInt16LE(Math.round(left * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(right * 32767), 46 + i * 4);
}

const output = path.resolve("public/audio/hestra-original-score.wav");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, wav);
console.log(`Generated ${output} (${seconds}s, ${sampleRate} Hz stereo)`);
