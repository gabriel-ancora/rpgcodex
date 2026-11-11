// Procedural Web Audio API Mixer for RPG Soundboard & Ambience
export type AmbienceTrackId =
  | 'combat_pulse'
  | 'heavy_rain'
  | 'campfire'
  | 'dungeon_wind'
  | 'tavern_murmur'
  | 'ritual_drone';

export type OneShotSfxId = 'thunder' | 'sword_clash' | 'funeral_bell' | 'arcane_blast' | 'monster_roar';

interface ActiveTrackNodes {
  gainNode: GainNode;
  stopFn: () => void;
}

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeTracks: Map<AmbienceTrackId, ActiveTrackNodes> = new Map();
  private isMuted: boolean = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink/brownish noise approximation for warm natural sound
      data[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = data[i];
      data[i] *= 2.5;
    }
    return buffer;
  }

  public toggleTrack(trackId: AmbienceTrackId, volume: number): boolean {
    if (this.activeTracks.has(trackId)) {
      this.stopTrack(trackId);
      return false;
    } else {
      this.startTrack(trackId, volume);
      return true;
    }
  }

  public setTrackVolume(trackId: AmbienceTrackId, volume: number): void {
    const track = this.activeTracks.get(trackId);
    if (track && this.ctx) {
      track.gainNode.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.08);
    }
  }

  public setMasterMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.08);
    }
  }

  public stopAll(): void {
    for (const id of this.activeTracks.keys()) {
      this.stopTrack(id);
    }
  }

  public stopTrack(trackId: AmbienceTrackId): void {
    const track = this.activeTracks.get(trackId);
    if (track) {
      try {
        track.stopFn();
      } catch {
        // ignore already stopped
      }
      this.activeTracks.delete(trackId);
    }
  }

  public startTrack(trackId: AmbienceTrackId, volume: number): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    this.stopTrack(trackId);

    const trackGain = ctx.createGain();
    trackGain.gain.value = volume;
    trackGain.connect(this.masterGain);

    const cleanupFns: (() => void)[] = [];

    if (trackId === 'heavy_rain') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 4);
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 950;
      filter.Q.value = 0.6;

      noise.connect(filter);
      filter.connect(trackGain);
      noise.start();
      cleanupFns.push(() => noise.stop());
    } else if (trackId === 'campfire') {
      // Warm low crackle + periodic sparks
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 3);
      noise.loop = true;

      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = 'lowpass';
      lowFilter.frequency.value = 280;

      noise.connect(lowFilter);
      lowFilter.connect(trackGain);
      noise.start();

      const interval = window.setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const popOsc = ctx.createOscillator();
        const popGain = ctx.createGain();
        popOsc.type = 'triangle';
        popOsc.frequency.value = 1200 + Math.random() * 1800;
        popGain.gain.setValueAtTime(0.08 * volume, ctx.currentTime);
        popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        popOsc.connect(popGain);
        popGain.connect(trackGain);
        popOsc.start();
        popOsc.stop(ctx.currentTime + 0.045);
      }, 180);

      cleanupFns.push(() => {
        noise.stop();
        clearInterval(interval);
      });
    } else if (trackId === 'dungeon_wind') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 5);
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 320;
      filter.Q.value = 4.5;

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.14;
      lfoGain.gain.value = 160;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      noise.connect(filter);
      filter.connect(trackGain);
      noise.start();
      lfo.start();
      cleanupFns.push(() => {
        noise.stop();
        lfo.stop();
      });
    } else if (trackId === 'combat_pulse') {
      // Dark fantasy war drums + low cello drone (D minor)
      const droneOsc = ctx.createOscillator();
      const droneFilter = ctx.createBiquadFilter();
      droneOsc.type = 'sawtooth';
      droneOsc.frequency.value = 73.42; // D2
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 190;
      const droneSubGain = ctx.createGain();
      droneSubGain.gain.value = 0.25;

      droneOsc.connect(droneFilter);
      droneFilter.connect(droneSubGain);
      droneSubGain.connect(trackGain);
      droneOsc.start();

      let step = 0;
      const interval = window.setInterval(() => {
        if (!this.ctx) return;
        const pattern = [1, 0, 0.5, 0.8, 1, 0, 0.4, 0];
        const hit = pattern[step % pattern.length];
        step++;
        if (hit > 0) {
          const kick = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(110 * hit + 40, ctx.currentTime);
          kick.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.22);
          kickGain.gain.setValueAtTime(0.55 * hit, ctx.currentTime);
          kickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
          kick.connect(kickGain);
          kickGain.connect(trackGain);
          kick.start();
          kick.stop(ctx.currentTime + 0.25);
        }
      }, 280);

      cleanupFns.push(() => {
        droneOsc.stop();
        clearInterval(interval);
      });
    } else if (trackId === 'ritual_drone') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc1.frequency.value = 55; // A1
      osc2.type = 'triangle';
      osc2.frequency.value = 82.41; // E2 fifth

      filter.type = 'lowpass';
      filter.frequency.value = 240;

      const subGain = ctx.createGain();
      subGain.gain.value = 0.35;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(subGain);
      subGain.connect(trackGain);

      osc1.start();
      osc2.start();
      cleanupFns.push(() => {
        osc1.stop();
        osc2.stop();
      });
    } else if (trackId === 'tavern_murmur') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 4);
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 480;
      filter.Q.value = 1.2;

      const subGain = ctx.createGain();
      subGain.gain.value = 0.45;

      noise.connect(filter);
      filter.connect(subGain);
      subGain.connect(trackGain);
      noise.start();
      cleanupFns.push(() => noise.stop());
    }

    this.activeTracks.set(trackId, {
      gainNode: trackGain,
      stopFn: () => cleanupFns.forEach((fn) => fn()),
    });
  }

  public playOneShot(sfxId: OneShotSfxId): void {
    const ctx = this.ensureContext();
    if (!this.masterGain || this.isMuted) return;

    const now = ctx.currentTime;

    if (sfxId === 'thunder') {
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 2.5);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 2.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 2.4);
    } else if (sfxId === 'funeral_bell') {
      const freqs = [220, 440, 528, 660];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.3 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 3.1);
      });
    } else if (sfxId === 'sword_clash') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (sfxId === 'arcane_blast') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.45);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (sfxId === 'monster_roar') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(55, now + 1.1);
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.25);
    }
  }
}

export const soundEngine = new ProceduralAudioEngine();

