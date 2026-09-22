"use client";

let sharedContext: AudioContext | null = null;

const SOUND_PREF_KEY = "gossips_sound_effects_enabled";

/** Whether UI sound effects (sent/record/ring) are enabled. Defaults to on. */
export function areSoundEffectsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(SOUND_PREF_KEY);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
}

export function setSoundEffectsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedContext) {
      sharedContext = new AudioCtx();
    }
    if (sharedContext.state === "suspended") {
      sharedContext.resume().catch(() => {});
    }
    return sharedContext;
  } catch {
    return null;
  }
}

function playTone(frequency: number, startOffset: number, durationSeconds: number, gainPeak = 0.15) {
  try {
    if (!areSoundEffectsEnabled()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    const startTime = ctx.currentTime + startOffset;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gainPeak, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSeconds);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds + 0.02);
  } catch {
    // Never let a sound-effect failure break the caller's flow.
  }
}

/** Short blip played when the user starts recording a voice message. */
export function playRecordStartSound() {
  playTone(880, 0, 0.09, 0.12);
}

/** Soft two-tone digital "pop" played after a message is successfully sent. */
export function playMessageSentSound() {
  playTone(1400, 0, 0.06, 0.05);
  playTone(1800, 0.05, 0.09, 0.045);
}

/** Soft descending chime played when a new message is received (distinct from the sent sound). */
export function playMessageReceivedSound() {
  playTone(1250, 0, 0.12, 0.06);
  playTone(950, 0.1, 0.22, 0.055);
}

let ringbackInterval: number | null = null;
let ringtoneInterval: number | null = null;

/** Caller-side repeating "ringback" tone, like a phone dial tone (tuut...tuut...). */
export function startOutgoingRingback() {
  stopOutgoingRingback();
  const playCycle = () => {
    playTone(480, 0, 0.35, 0.06);
    playTone(620, 0, 0.35, 0.06);
  };
  playCycle();
  ringbackInterval = window.setInterval(playCycle, 2000);
}

export function stopOutgoingRingback() {
  if (ringbackInterval) {
    window.clearInterval(ringbackInterval);
    ringbackInterval = null;
  }
}

/** Receiver-side repeating ringtone + vibration (vibration is a no-op on iOS Safari). */
export function startIncomingRingtone() {
  stopIncomingRingtone();
  const playCycle = () => {
    playTone(988, 0, 0.15, 0.14);
    playTone(1319, 0.18, 0.15, 0.14);
    playTone(988, 0.5, 0.15, 0.14);
    playTone(1319, 0.68, 0.15, 0.14);
  };
  playCycle();
  ringtoneInterval = window.setInterval(playCycle, 1600);

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate?.([400, 200, 400, 200, 400]);
    } catch {
      // Some browsers restrict vibrate() outside a direct user gesture; ignore.
    }
  }
}

export function stopIncomingRingtone() {
  if (ringtoneInterval) {
    window.clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate?.(0);
    } catch {
      // ignore
    }
  }
}
