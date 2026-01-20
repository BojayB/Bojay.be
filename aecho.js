/**
 * AEchoAudioEngine v1.5.2 — Gapless Scheduler + Visualizer (Fixed Bar Spacing)
 */
console.log("AECHO ENGINE LOADED - VERSION CHECK", "with inIntro =", true);


const AEchoAudioEngine = (function () {
  const actx = new (window.AudioContext || window.webkitAudioContext)();

  let buffers = {};
  let state = {
    isPlaying: false,
    stopRequested: false,
    loopDuration: 0,
    loopStartTime: 0,
    loopIteration: 0,
    config: {},
    useStrictTiming: false,
    activeLoopSource: null,
    currentSources: [],
    volumeGain: actx.createGain(),
    analyser: actx.createAnalyser(),
    currentTrackName: "",
    userVolume: 1.0,
    animationFrameId: null,
    scheduledLoopTimer: null,
    seekUpdateInterval: null,
    inIntro: false,
  };

  state.analyser.fftSize = 4096;
  const dataArray = new Uint8Array(state.analyser.frequencyBinCount);

  state.volumeGain.gain.setValueAtTime(state.userVolume, actx.currentTime);
  state.volumeGain.connect(state.analyser);
  state.analyser.connect(actx.destination);

  function loadAudio(url) {
    return fetch(url)
      .then(res => res.arrayBuffer())
      .then(data => actx.decodeAudioData(data));
  }

  async function init({ intro, loop, exit = null, autoLoop = true, hasExit = true, strictTiming = false, title = "" }) {
    if (state.isPlaying) return;
    state.config = { intro, loop, exit, autoLoop, hasExit, title };
    state.useStrictTiming = strictTiming;
    state.stopRequested = false;
    state.loopIteration = 0;
    buffers = {};

    if (intro) {
  buffers.intro = await loadAudio(intro);
}
buffers.loop = await loadAudio(loop);

if (exit && hasExit) {
  buffers.exit = await loadAudio(exit);
}

    state.loopDuration = buffers.loop.duration;
    state.isPlaying = true;
    state.currentTrackName = title || loop;
    updateTrackDisplay();

    stopAllSources();
    playIntro();

  }

  function createSource(buffer) {
    const source = actx.createBufferSource();
    source.buffer = buffer;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(1, actx.currentTime);
    source.connect(gain).connect(state.volumeGain);
    state.currentSources.push(source);
    return { source, gain };
  }

  function stopAllSources() {
    state.currentSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    state.currentSources = [];
  }

  function fadeIn(gain, time = 0.02) {
    gain.gain.setValueAtTime(0, actx.currentTime);
    gain.gain.linearRampToValueAtTime(1, actx.currentTime + time);
  }

  function playIntro() {
  if (!buffers.intro) {
    // No intro provided? Just start the loop directly
    const now = actx.currentTime;
    state.inIntro = false;
    state.loopStartTime = now;
    scheduleLoop(now);
    startVisualizer();
    return;
  }

  const { source, gain } = createSource(buffers.intro);
  fadeIn(gain);
  const now = actx.currentTime;
  state.inIntro = true;
  source.start(now);

  const loopStart = now + buffers.intro.duration;
  state.loopStartTime = loopStart;

  scheduleLoop(loopStart);
  setTimeout(() => { state.inIntro = false; }, buffers.intro.duration * 1000);
  startVisualizer();
}


  function scheduleLoop(startTime) {
  const { source, gain } = createSource(buffers.loop);
  fadeIn(gain);
  source.start(startTime);
  
  // update loopstarttime whyen this loop iteration actually begins
  //this keeps getcurrenttime() cycling 0..duration instead of counting forever
  const msUntilStart = Math.max(0, startTime - actx.currentTime * 1000);
  setTimeout(() => {
    //only update if we're still playing and this is the active loop
    if (!state.stopRequested && state.activeLoopSource === source) {
      state.loopStartTime = startTime;
    }
  }, msUntilStart);
  


  state.activeLoopSource = source;
  state.loopIteration++;

  const nextLoopTime = startTime + state.loopDuration;

  if (!state.stopRequested) {
    // Schedule next loop slightly before the current one ends
    if (state.scheduledLoopTimer) {
      clearTimeout(state.scheduledLoopTimer);
    }
    
    if (!state.animationFrameId) startVisualizer();


    const scheduleAhead = 150; // ms ahead to safely queue next loop
    const timeUntilNext = (nextLoopTime - actx.currentTime) * 1000 - scheduleAhead;

    state.scheduledLoopTimer = setTimeout(() => {
  if (!state.stopRequested) {
    scheduleLoop(nextLoopTime);
  } else {
  if (buffers.exit && state.config.hasExit) {
    const { source: exitSource, gain: exitGain } = createSource(buffers.exit);
    fadeIn(exitGain);
    exitSource.start(nextLoopTime);

    exitSource.onended = () => {
      state.isPlaying = false;
      stopVisualizer();
    };
  } else {
    state.isPlaying = false;
    stopVisualizer();
  }
}

}, Math.max(0, timeUntilNext));

  } else {
  if (buffers.exit && state.config.hasExit) {
    const { source: exitSource, gain: exitGain } = createSource(buffers.exit);
    fadeIn(exitGain);
    exitSource.start(nextLoopTime);

    exitSource.onended = () => {
      state.isPlaying = false;
      stopVisualizer();
    };
  } else {
    state.isPlaying = false;
    stopVisualizer();
  }
}

}




  function playExit() {
    if (!buffers.exit || !state.config.hasExit) {
      state.isPlaying = false;
      return;
    }

    const now = actx.currentTime;
    const { source, gain } = createSource(buffers.exit);
    fadeIn(gain);
    source.start(now);

    source.onended = () => {
      state.isPlaying = false;
      stopVisualizer();
    };
  }

  function stop() {
    state.stopRequested = true;
  }

  function resumeIfSuspended() {
    if (actx.state === 'suspended') actx.resume();
  }

  function setVolume(level) {
    state.userVolume = level;
    state.volumeGain.gain.setValueAtTime(level, actx.currentTime);
  }

  function updateTrackDisplay() {
    const display = document.getElementById("track-display");
    if (display) display.textContent = `Now Playing: ${state.currentTrackName}`;
  }

  function startVisualizer() {
  const canvas = document.getElementById("visualizer");
  if (!canvas) return;

  canvas.width = canvas.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;

  const ctx = canvas.getContext("2d");
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const midY = canvas.clientHeight / 2;
  const barCount = 512; // 128 left + 128 right
  const spacing = 1;
  const totalSpacing = spacing * (barCount - 1);
  const barWidth = (canvas.clientWidth - totalSpacing) / barCount;

  const minHz = 1;
  const maxHz = 12000;
  const sampleRate = actx.sampleRate;
  const nyquist = sampleRate / 2;
  const logPower = 0.1;

  function draw() {
  state.animationFrameId = requestAnimationFrame(draw);
  state.analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

  const centerY = canvas.height / window.devicePixelRatio / 2;

  for (let i = 0; i < barCount; i++) {
    const norm =  1 - i / (barCount - 1);
    const logFreq = minHz * Math.pow(maxHz / minHz, Math.pow(norm, logPower));
    const freqIndex = Math.floor((logFreq / nyquist) * dataArray.length);
    const val = dataArray[Math.min(freqIndex, dataArray.length - 1)] || 0;

    const left = val * 0.9; // simulate left channel
    const right = val * 1.1; // simulate right channel

    const leftStrength = Math.pow(left / 255, 0.9);
    const rightStrength = Math.pow(right / 255, 0.9);

    const barHeightLeft = leftStrength * (canvas.clientHeight / 2);
    const barHeightRight = rightStrength * (canvas.clientHeight / 2);

    const x = i * (barWidth + spacing);

    const color = `rgba(${val + 60}, ${val * 0.4}, 255, 1.0)`;

    ctx.fillStyle = color;
    ctx.fillRect(x, centerY - barHeightLeft, barWidth, barHeightLeft);  // up for left
    ctx.fillRect(x, centerY, barWidth, barHeightRight);                // down for right
  }
}


  draw();
}




  function stopVisualizer() {
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
  }
  
  
  
  
  //space for things hehe



function playCustomBuffer(buffer) {
  const { source, gain } = createSource(buffer);
  fadeIn(gain);
  const now = actx.currentTime;
  source.start(now);
  state.loopStartTime = now;
  scheduleLoop(now);
  startVisualizer();
}


  function getCurrentTime() {
    if (state.inIntro) return actx.currentTime - state.loopStartTime;
    
  return Math.max(0, actx.currentTime - state.loopStartTime);
}

function getDuration() {
  return state.loopDuration || 1;
}

function getCurrentBuffer() {
  return buffers.loop || null;
}

function seekTo(timeInSeconds) {
  if (!buffers.loop || typeof timeInSeconds !== 'number') return;
  stopAllSources();
  if (state.scheduledLoopTimer) clearTimeout(state.scheduledLoopTimer);
  
  state.inIntro = false;

  const { source, gain } = createSource(buffers.loop);
  fadeIn(gain);
  const startTime = actx.currentTime;

  const offset = timeInSeconds % buffers.loop.duration;

  source.start(startTime, offset);
  state.loopStartTime = startTime - offset;
  state.activeLoopSource = source;

  // When we start the loop buffer at an offset, the "next loop boundary"
// happens in (duration - offset) seconds.
const dur = buffers.loop.duration;
const timeUntilBoundary = dur - offset;
const nextLoopTime = startTime + timeUntilBoundary;

// Schedule the next loop slightly before the boundary so it's gapless.
const scheduleAheadMs = 150;
const delayMs = Math.max(0, (nextLoopTime - actx.currentTime) * 1000 - scheduleAheadMs);

state.scheduledLoopTimer = setTimeout(() => {
  if (!state.stopRequested) scheduleLoop(nextLoopTime);
}, delayMs);


}

function stopNow() {
  if (state.scheduledLoopTimer) {
    clearTimeout(state.scheduledLoopTimer);
    state.scheduledLoopTimer = null;
  }
  stopAllSources();
  stopVisualizer();
  state.isPlaying = false;
  state.stopRequested = false;
  state.activeLoopSource = null;
  state.loopStartTime = actx.currentTime;
  state.currentTrackName = "";
  updateTrackDisplay();
}

  
  
  
  
  function play() {
  resumeIfSuspended();
  playIntro();
}
  

  return {
  init,
  play,
  stop,
  resumeIfSuspended,
  setVolume,
  actx,
  getCurrentTime,
  getDuration,
  getCurrentBuffer,
  seekTo,
  stopNow,
  changeTrackSet: async function ({ intro = null, loop, exit = null, hasExit = true, strictTiming = false, title = "" }) {
    if (state.scheduledLoopTimer) {
      clearTimeout(state.scheduledLoopTimer);
      state.scheduledLoopTimer = null;
    }

    stopAllSources();
    state.inIntro = false;
    state.stopRequested = false;
    state.isPlaying = false;
    buffers = {};
    state.config = { intro, loop, exit, hasExit, title };
    state.useStrictTiming = strictTiming;
    state.loopIteration = 0;
    state.currentTrackName = title || (typeof loop === 'string' ? loop : "Local Upload");
    updateTrackDisplay();

    if (loop instanceof AudioBuffer) {
      buffers.loop = loop;
    } else {
      buffers.loop = await loadAudio(loop);
    }

    if (intro && typeof intro === 'string') {
      buffers.intro = await loadAudio(intro);
    }

    if (exit && hasExit && typeof exit === 'string') {
      buffers.exit = await loadAudio(exit);
    }

    state.loopDuration = buffers.loop.duration;
    state.isPlaying = true;
    state.volumeGain.gain.setValueAtTime(state.userVolume, actx.currentTime);

    playIntro();
  }
};

})();
