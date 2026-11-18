import { NoteName, NoteTuning, KorgStyle } from '../types';
import { NOTE_NAMES } from '../data/korgPresets';

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  midiNote: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeVoices: Map<number, ActiveVoice> = new Map();
  private tunings: Record<NoteName, NoteTuning> | null = null;
  private currentInstrument: 'oud' | 'nay' | 'qanun' | 'accordion' | 'lead' | 'strings' = 'nay';
  private currentPitchBendCents: number = 0;

  // Rhythm Sequencer
  private isRhythmPlaying: boolean = false;
  private currentRhythm: KorgStyle | null = null;
  private tempoBpm: number = 118;
  private currentStep: number = 0;
  private stepIntervalId: number | null = null;
  private stepCallbacks: Set<(step: number) => void> = new Set();
  private isVariation2: boolean = false;
  private fillActiveCountdown: number = 0;
  private droneVoice: { oscillators: OscillatorNode[]; gainNode: GainNode; midiNote: number } | null = null;

  constructor() {
    // Lazy AudioContext creation on first user interaction
  }

  public setPitchBend(normalized: number) {
    this.currentPitchBendCents = normalized * 200; // +/- 2 semitones standard bend
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeVoices.forEach((voice) => {
      voice.oscillators.forEach((osc) => {
        try {
          if ('detune' in osc) {
            osc.detune.setValueAtTime(this.currentPitchBendCents, now);
          }
        } catch (_) {}
      });
    });
  }

  public playPadSound(padNum: 1 | 2 | 3 | 4) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    switch (padNum) {
      case 1: {
        // Darbuka Roll: Fast triplet Dum - Tak - Tak
        this.playDum(now, 1.0);
        this.playTak(now + 0.08, 0.85);
        this.playTak(now + 0.16, 0.95);
        break;
      }
      case 2: {
        // Zagharid (زغاريد / صرخة فرح شرقية): Fast frequency modulation trill
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1600, now);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(14, now); // 14 Hz fast trill
        lfoGain.gain.setValueAtTime(180, now);
        lfo.connect(osc.frequency);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(gain);
        gain.connect(this.masterGain);

        lfo.start(now);
        osc.start(now);
        osc.stop(now + 0.86);
        lfo.stop(now + 0.86);
        break;
      }
      case 3: {
        // Hand Clap / Katem Slap
        this.playSak(now, 0.9);
        this.playTak(now + 0.02, 0.7);
        break;
      }
      case 4: {
        // Riq Tambourine Jingle Splash
        this.playRiq(now, 0.9);
        this.playRiq(now + 0.06, 0.8);
        this.playRiq(now + 0.12, 0.7);
        break;
      }
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setTunings(tunings: Record<NoteName, NoteTuning>) {
    this.tunings = tunings;
  }

  public setInstrument(type: 'oud' | 'nay' | 'qanun' | 'accordion' | 'lead' | 'strings') {
    this.currentInstrument = type;
  }

  public setMasterVolume(vol: number) {
    this.initContext();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol / 127)), this.ctx.currentTime);
    }
  }

  /**
   * Note frequency calculation with microtonal quarter-tone tuning (-50 cents)
   */
  public getFrequency(midiNote: number): number {
    const noteIndex = midiNote % 12;
    const noteName = NOTE_NAMES[noteIndex];
    let centOffset = 0;

    if (this.tunings && this.tunings[noteName]) {
      const t = this.tunings[noteName];
      if (t.isQuarterTone) {
        centOffset = t.cents || -50;
      }
    }

    const semitonesFromA4 = (midiNote - 69) + (centOffset / 100);
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  public playNote(midiNote: number, velocity: number = 100) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Release existing voice on same note
    this.stopNote(midiNote);

    const freq = this.getFrequency(midiNote);
    const now = this.ctx.currentTime;
    const velFactor = Math.max(0.1, velocity / 127);

    const voiceGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const oscillators: OscillatorNode[] = [];

    switch (this.currentInstrument) {
      case 'nay': {
        // Warm fluty sound with gentle vibrato and soft attack
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, now); // 2nd harmonic breath

        // Subtle LFO vibrato (5 Hz)
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(5.2, now);
        lfoGain.gain.setValueAtTime(1.8, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);
        lfo.start(now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2600, now);

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.5 * velFactor, now + 0.05);

        const subGain2 = this.ctx.createGain();
        subGain2.gain.setValueAtTime(0.2, now);
        osc2.connect(subGain2);
        subGain2.connect(filter);

        osc1.connect(filter);
        filter.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);
        oscillators.push(osc1, osc2, lfo);
        break;
      }

      case 'oud': {
        // Acoustic pluck: fast percussive attack, rich harmonics with gentle body resonance
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2800, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.6);

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.7 * velFactor, now + 0.015);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(voiceGain);

        osc.start(now);
        subOsc.start(now);
        oscillators.push(osc, subOsc);
        break;
      }

      case 'qanun': {
        // Bright metallic pluck with lingering resonance
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.Q.setValueAtTime(2.5, now);

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.65 * velFactor, now + 0.008);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(filter);
        filter.connect(voiceGain);

        osc.start(now);
        oscillators.push(osc);
        break;
      }

      case 'accordion': {
        // Dual detuned sawtooths for classic Egyptian musette beating
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq + 1.5, now); // +1.5 Hz detune for musette

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.45 * velFactor, now + 0.03);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);
        oscillators.push(osc1, osc2);
        break;
      }

      case 'lead': {
        // Classic Triton / Pa Oriental Saw Lead with resonant sweep
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3500, now);
        filter.Q.setValueAtTime(4.0, now);

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.55 * velFactor, now + 0.02);

        osc.connect(filter);
        filter.connect(voiceGain);

        osc.start(now);
        oscillators.push(osc);
        break;
      }

      case 'strings':
      default: {
        // Warm ensemble strings with slow attack
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq - 1.2, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);

        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(0.4 * velFactor, now + 0.12);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);
        oscillators.push(osc1, osc2);
        break;
      }
    }

    if (this.currentPitchBendCents !== 0) {
      oscillators.forEach((osc) => {
        try {
          if ('detune' in osc) {
            osc.detune.setValueAtTime(this.currentPitchBendCents, now);
          }
        } catch (_) {}
      });
    }

    voiceGain.connect(this.masterGain);
    this.activeVoices.set(midiNote, {
      oscillators,
      gainNode: voiceGain,
      filterNode: filter,
      midiNote,
    });
  }

  private previewTimers: Map<number, number> = new Map();
  private auditionTimeouts: number[] = [];

  public playPreviewNote(midiNote: number, durationMs: number = 420) {
    const existing = this.previewTimers.get(midiNote);
    if (existing !== undefined) {
      clearTimeout(existing);
    }
    this.playNote(midiNote, 105);
    const tid = window.setTimeout(() => {
      this.stopNote(midiNote);
      this.previewTimers.delete(midiNote);
    }, durationMs);
    this.previewTimers.set(midiNote, tid);
  }

  public stopScaleAudition() {
    this.auditionTimeouts.forEach(t => clearTimeout(t));
    this.auditionTimeouts = [];
  }

  public playScaleAudition(rootMidiNote: number = 60) {
    this.initContext();
    this.stopScaleAudition();
    const intervals = [0, 2, 4, 5, 7, 9, 11, 12];
    intervals.forEach((semi, idx) => {
      const note = rootMidiNote + semi;
      const tid = window.setTimeout(() => {
        this.playPreviewNote(note, idx === intervals.length - 1 ? 520 : 250);
      }, idx * 240);
      this.auditionTimeouts.push(tid);
    });
  }

  public stopNote(midiNote: number) {
    const voice = this.activeVoices.get(midiNote);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    setTimeout(() => {
      voice.oscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (_) {}
      });
      voice.gainNode.disconnect();
    }, 120);

    this.activeVoices.delete(midiNote);
  }

  public startDrone(midiNote: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    this.stopDrone();

    const now = this.ctx.currentTime;
    const baseFreq = this.getFrequency(midiNote);
    const fifthFreq = this.getFrequency(midiNote + 7);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);

    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.linearRampToValueAtTime(0.22, now + 0.35);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(baseFreq, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(fifthFreq, now);

    const subGain2 = this.ctx.createGain();
    subGain2.gain.setValueAtTime(0.4, now);

    osc1.connect(filter);
    osc2.connect(subGain2);
    subGain2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    this.droneVoice = {
      oscillators: [osc1, osc2],
      gainNode: droneGain,
      midiNote,
    };
  }

  public stopDrone() {
    if (!this.droneVoice || !this.ctx) return;
    const voice = this.droneVoice;
    this.droneVoice = null;
    const now = this.ctx.currentTime;
    try {
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(Math.max(0.0001, voice.gainNode.gain.value), now);
      voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    } catch (_) {}

    window.setTimeout(() => {
      voice.oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (_) {}
      });
      try {
        voice.gainNode.disconnect();
      } catch (_) {}
    }, 280);
  }

  public stopAllNotes() {
    this.stopScaleAudition();
    this.stopDrone();
    this.previewTimers.forEach(t => clearTimeout(t));
    this.previewTimers.clear();
    this.activeVoices.forEach((_, note) => this.stopNote(note));
  }

  // --- Arabic Percussion Synthesizer & Arranger Sequencer ---

  private playDum(time: number, velocity: number = 1) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.18);

    gain.gain.setValueAtTime(0.9 * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.36);
  }

  private playTak(time: number, velocity: number = 0.8) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, time);
    osc.frequency.exponentialRampToValueAtTime(280, time + 0.06);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(600, time);

    gain.gain.setValueAtTime(0.7 * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playSak(time: number, velocity: number = 0.5) {
    if (!this.ctx || !this.masterGain) return;
    // Muted slap using high filtered click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.04);

    gain.gain.setValueAtTime(0.4 * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  private playRiq(time: number, velocity: number = 0.4) {
    if (!this.ctx || !this.masterGain) return;
    // Jingling tambourine cymbal rattle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(3200, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, time);
    filter.Q.setValueAtTime(6, time);

    gain.gain.setValueAtTime(0.3 * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.09);
  }

  public startRhythm(style: KorgStyle, bpm?: number) {
    this.initContext();
    this.stopRhythm();

    this.currentRhythm = style;
    this.tempoBpm = bpm || style.bpm;
    this.isRhythmPlaying = true;
    this.currentStep = 0;

    // 16th note interval calculation (BPM = quarter notes per min, 1 beat = 4 16th notes)
    // 60 / BPM / 4 * 1000 ms
    const stepDurationMs = (60 / this.tempoBpm / 4) * 1000;

    this.stepIntervalId = window.setInterval(() => {
      this.tickRhythmStep();
    }, stepDurationMs);
  }

  public stopRhythm() {
    this.isRhythmPlaying = false;
    if (this.stepIntervalId !== null) {
      clearInterval(this.stepIntervalId);
      this.stepIntervalId = null;
    }
    this.currentStep = 0;
    this.notifyStepCallbacks(0);
  }

  public setTempo(bpm: number) {
    this.tempoBpm = Math.max(40, Math.min(260, bpm));
    if (this.isRhythmPlaying && this.currentRhythm) {
      this.startRhythm(this.currentRhythm, this.tempoBpm);
    }
  }

  public toggleVariation() {
    this.isVariation2 = !this.isVariation2;
  }

  public triggerFill() {
    this.fillActiveCountdown = 4; // 4 steps of fill
  }

  private tickRhythmStep() {
    if (!this.ctx || !this.currentRhythm) return;
    const now = this.ctx.currentTime;
    const step = this.currentStep;
    const pattern = this.currentRhythm.pattern;

    if (this.fillActiveCountdown > 0) {
      // Energetic fill roll
      this.playTak(now, 0.9);
      if (step % 2 === 0) this.playDum(now, 0.95);
      this.playRiq(now, 0.6);
      this.fillActiveCountdown--;
    } else {
      // Standard pattern
      if (pattern.dum.includes(step)) {
        this.playDum(now, 1.0);
      }
      if (pattern.tak.includes(step)) {
        this.playTak(now, 0.85);
      }
      if (pattern.sak.includes(step)) {
        this.playSak(now, 0.55);
      }
      if (pattern.riq.includes(step) || (this.isVariation2 && step % 2 === 0)) {
        this.playRiq(now, this.isVariation2 ? 0.5 : 0.35);
      }
    }

    this.notifyStepCallbacks(step);
    this.currentStep = (this.currentStep + 1) % 16;
  }

  public subscribeStep(cb: (step: number) => void): () => void {
    this.stepCallbacks.add(cb);
    return () => this.stepCallbacks.delete(cb);
  }

  private notifyStepCallbacks(step: number) {
    this.stepCallbacks.forEach(cb => {
      try { cb(step); } catch (_) {}
    });
  }

  public getIsPlaying(): boolean {
    return this.isRhythmPlaying;
  }
}

export const audioEngine = new AudioEngine();
