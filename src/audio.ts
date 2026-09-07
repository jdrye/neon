import type { SoundEvent } from "./game";
/** All sound is synthesized locally, after a user gesture. */
export class Synth {
  enabled = true;
  context: AudioContext | null = null;
  lastShot = 0;
  master: GainNode | null = null;
  async unlock() {
    if (!this.enabled) return;
    try {
      this.context ||= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.gain.value = 0.17;
        this.master.connect(this.context.destination);
      }
      await this.context.resume();
    } catch {
      /* Audio is optional when a browser blocks it. */
    }
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    if (this.master) this.master.gain.value = value ? 0.17 : 0;
    if (value) void this.unlock();
  }
  tone(
    frequency: number,
    end: number,
    duration: number,
    type: OscillatorType = "sine",
    gain = 0.4,
    delay = 0,
  ) {
    const c = this.context;
    if (!c || !this.master || !this.enabled || c.state !== "running") return;
    const t = c.currentTime + delay,
      osc = c.createOscillator(),
      envelope = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    envelope.gain.setValueAtTime(0.001, t);
    envelope.gain.linearRampToValueAtTime(gain, t + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(envelope);
    envelope.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
    };
  }
  play(event: SoundEvent) {
    if (event === "shoot") {
      const now = this.context?.currentTime || 0;
      if (now - this.lastShot < 0.09) return;
      this.lastShot = now;
      this.tone(720, 220, 0.065, "triangle", 0.17);
    } else if (event === "kill") this.tone(160, 45, 0.13, "triangle", 0.5);
    else if (event === "damage") this.tone(120, 35, 0.23, "sawtooth", 0.4);
    else if (event === "dash") this.tone(160, 980, 0.17, "sine", 0.4);
    else if (event === "pulse") {
      this.tone(80, 26, 0.65, "sawtooth", 0.6);
      this.tone(900, 90, 0.6, "sine", 0.5);
    } else if (event === "pickup") this.tone(880, 1300, 0.065, "sine", 0.15);
    else if (event === "defeat")
      [220, 185, 147, 110].forEach((f, i) =>
        this.tone(f, f * 0.85, 0.45, "triangle", 0.4, i * 0.18),
      );
    else if (event === "sector" || event === "relay" || event === "victory")
      [330, 440, 660, 880].forEach((f, i) =>
        this.tone(f, f, 0.3, "sine", 0.3, i * 0.09),
      );
  }
}
