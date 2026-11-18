// Every sound in Emberlight is synthesised with WebAudio — no audio files.
// A tiny pad hums under the game, and short blips mark shots, hits, pickups
// and wave horns. Nothing starts until the player first interacts, which is
// what browsers require, and M mutes everything.

export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    padNodes: null,
  };

  audio.ensure = function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.startPad();
  };

  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    if (audio.padNodes) audio.padNodes.gain.gain.value = audio.muted ? 0 : 0.045;
    return audio.muted;
  };

  // Two detuned triangle waves through a slow filter: a quiet night hum.
  audio.startPad = function startPad() {
    const ctx = audio.ctx;
    const gain = ctx.createGain();
    gain.gain.value = audio.muted ? 0 : 0.045;
    gain.connect(ctx.destination);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.connect(gain);
    const a = ctx.createOscillator();
    a.type = 'triangle';
    a.frequency.value = 110;
    const b = ctx.createOscillator();
    b.type = 'triangle';
    b.frequency.value = 164.8;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    a.connect(filter);
    b.connect(filter);
    a.start();
    b.start();
    lfo.start();
    audio.padNodes = { gain };
  };

  function tone(freq, dur, type, vol, slideTo) {
    if (!audio.ctx || audio.muted) return;
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  audio.shoot = function shoot() {
    tone(720 + Math.random() * 120, 0.07, 'square', 0.05, 340);
  };
  audio.flare = function flare() {
    tone(220, 0.35, 'sawtooth', 0.09, 880);
    tone(440, 0.3, 'sine', 0.07, 1320);
  };
  audio.hit = function hit() {
    tone(190, 0.09, 'triangle', 0.08, 90);
  };
  audio.kill = function kill() {
    tone(520, 0.12, 'sine', 0.07, 180);
  };
  audio.pickup = function pickup() {
    tone(880, 0.09, 'sine', 0.07, 1320);
  };
  audio.hurt = function hurt() {
    tone(160, 0.3, 'sawtooth', 0.12, 60);
  };
  audio.waveHorn = function waveHorn() {
    tone(196, 0.5, 'sawtooth', 0.07, 294);
    tone(294, 0.5, 'sawtooth', 0.05, 392);
  };
  audio.win = function win() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.35, 'sine', 0.08), i * 130);
    });
  };
  audio.lose = function lose() {
    [392, 330, 262, 196].forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.4, 'triangle', 0.08), i * 160);
    });
  };

  return audio;
}
