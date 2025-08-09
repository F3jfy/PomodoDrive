/* ---------------------------- 
  Pomodoro timer + Settings modal
   - Cleaned for background switch on Save
-----------------------------*/

/* Defaults */
const defaults = {
  pomodoro: 25,
  short: 5,
  long: 10,
  sequence: false,
};

/* state */
let state = {
  mode: 'pomodoro', // 'pomodoro' | 'short' | 'long'
  durations: {...defaults},
  remaining: defaults.pomodoro * 60,
  timerId: null,
  running: false,
  pomodoroCount: 0,
  backgroundImage: 'photo1.webp',  // default background
};

let bgNoiseAudio = null;
const volumeSlider = document.getElementById('volumeSlider');

if (volumeSlider) {
  volumeSlider.addEventListener('input', () => {
    const volume = parseFloat(volumeSlider.value);
    if (bgNoiseAudio) {
      bgNoiseAudio.volume = volume;
    }
  });
}


function playBackgroundNoise(file) {
  if (!file) {
    console.warn('No sound file provided for background noise');
    return;
  }
  if (bgNoiseAudio) {
    bgNoiseAudio.pause();
    bgNoiseAudio = null;
  }
  bgNoiseAudio = new Audio(file);
  bgNoiseAudio.loop = true;
  bgNoiseAudio.volume = 0.5;
  bgNoiseAudio.play();
}

function stopBackgroundNoise() {
  if (bgNoiseAudio) {
    bgNoiseAudio.pause();
    bgNoiseAudio = null;
  }
}
/* DOM elements */
const timerDisplay = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const modeButtons = document.querySelectorAll('.mode');
const progressFill = document.querySelector('.progress-fill');
const openSettings = document.getElementById('openSettings');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const closeNoSave = document.getElementById('closeNoSave');
const settingsForm = document.getElementById('settingsForm');
const inputPomodoro = document.getElementById('inputPomodoro');
const inputShort = document.getElementById('inputShort');
const inputLong = document.getElementById('inputLong');
const sequenceToggle = document.getElementById('sequenceToggle');
const backgroundSelect = document.getElementById('backgroundSelect');

/* Load settings from localStorage */
function loadState() {
  const saved = localStorage.getItem('pomodoroSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.durations = {...defaults, ...parsed};
      if (parsed.backgroundImage) {
        state.backgroundImage = parsed.backgroundImage;
        document.body.style.backgroundImage = `url('${state.backgroundImage}')`;
      }
    } catch {
      state.durations = {...defaults};
    }
  } else {
    state.durations = {...defaults};
    document.body.style.backgroundImage = `url('${state.backgroundImage}')`;
  }

  inputPomodoro.value = state.durations.pomodoro;
  inputShort.value = state.durations.short;
  inputLong.value = state.durations.long;
  sequenceToggle.checked = !!state.durations.sequence;
  backgroundSelect.value = state.backgroundImage;
  state.remaining = state.durations.pomodoro * 60;
  updateTimerDisplay();
  updateProgressBar();
}
loadState();

/* Mode switching */
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    state.remaining = state.durations[state.mode] * 60;
    updateTimerDisplay();
    updateProgressBar();
    stopTimer();
  });
});

/* Timer helpers */
function secToMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = secToMMSS(state.remaining);
}

function updateProgressBar() {
  const total = state.durations[state.mode] * 60;
  const frac = Math.max(0, Math.min(1, state.remaining / total));
  progressFill.style.width = `${frac * 100}%`;
}

/* Timer control */
function tick() {
  if (state.remaining > 0) {
    state.remaining--;
    updateTimerDisplay();
    updateProgressBar();
    if (state.remaining === 0) nextSession();
  }
}

function startTimer() {
  if (state.running) return;
  state.running = true;
  state.timerId = setInterval(tick, 1000);
}

function stopTimer() {
  state.running = false;
  clearInterval(state.timerId);
  state.timerId = null;
}

function pauseTimer() {
  stopTimer();
}

function resetTimer() {
  stopTimer();
  state.mode = 'pomodoro';
  modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === 'pomodoro'));
  state.pomodoroCount = 0;
  state.remaining = state.durations.pomodoro * 60;
  updateTimerDisplay();
  updateProgressBar();
}

/* Session switch & alarm */
function nextSession() {
  const alarm = document.getElementById('alarmSound');
  if (alarm) {
    alarm.currentTime = 0;
    alarm.play();
  }

  if (state.mode === 'pomodoro') {
    state.pomodoroCount++;
    if (state.durations.sequence) {
      state.mode = (state.pomodoroCount % 4 === 0) ? 'long' : 'short';
    } else {
      state.mode = 'short';
    }
  } else {
    state.mode = 'pomodoro';
  }
  state.remaining = state.durations[state.mode] * 60;

  modeButtons.forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });

  if (!state.running) {
    updateTimerDisplay();
    updateProgressBar();
  }
}

/* UI event bindings */
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

/* Settings modal open/close */
openSettings.addEventListener('click', () => {
  settingsModal.classList.add('show');
  document.body.classList.add('modal-open');
});
closeSettings.addEventListener('click', () => {
  settingsModal.classList.remove('show');
  document.body.classList.remove('modal-open');
});
closeNoSave.addEventListener('click', () => {
  settingsModal.classList.remove('show');
  document.body.classList.remove('modal-open');
});
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('show');
    document.body.classList.remove('modal-open');
  }
});

/* Save settings (including background change with fade) */
settingsForm.addEventListener('submit', (ev) => {
  ev.preventDefault();

  // Save durations
  const p = Math.max(1, parseInt(inputPomodoro.value, 10) || 25);
  const s = Math.max(1, parseInt(inputShort.value, 10) || 5);
  const l = Math.max(1, parseInt(inputLong.value, 10) || 10);
  const seq = Boolean(sequenceToggle.checked);

  state.durations.pomodoro = p;
  state.durations.short = s;
  state.durations.long = l;
  state.durations.sequence = seq;

  // Save background
  const newBg = backgroundSelect.value;
  state.backgroundImage = newBg;

  // Fade out current background
  document.body.classList.add('fade-bg-out');

  setTimeout(() => {
    document.body.style.backgroundImage = `url('${newBg}')`;
    document.body.classList.remove('fade-bg-out');
    document.body.classList.add('fade-bg-in');

    // Remove fade-in after transition
    setTimeout(() => {
      document.body.classList.remove('fade-bg-in');
    }, 400);
  }, 400);

  // Update timer state
  state.remaining = state.durations[state.mode] * 60;
  updateTimerDisplay();
  updateProgressBar();

  // Save to localStorage
  localStorage.setItem('pomodoroSettings', JSON.stringify({
    ...state.durations,
    backgroundImage: state.backgroundImage
  }));

  // Close modal
  settingsModal.classList.remove('show');
  document.body.classList.remove('modal-open');
});

/* Stop timer on unload */
window.addEventListener('beforeunload', stopTimer);

/* Initial UI update */
updateTimerDisplay();
updateProgressBar();


const bgNoiseToggleBtn = document.getElementById('bgNoiseToggleBtn');
if(bgNoiseToggleBtn){
  bgNoiseToggleBtn.addEventListener('click', () => {
    state.backgroundNoise = !state.backgroundNoise;

    if(state.backgroundNoise){
      playBackgroundNoise();
      bgNoiseToggleBtn.setAttribute('aria-pressed', 'true');
      bgNoiseToggleBtn.style.backgroundColor = '#ff5252';
      bgNoiseToggleBtn.style.color = '#000';
    } else {
      stopBackgroundNoise();
      bgNoiseToggleBtn.setAttribute('aria-pressed', 'false');
      bgNoiseToggleBtn.style.backgroundColor = 'rgba(14, 20, 30, 0.8)';
      bgNoiseToggleBtn.style.color = '#fff';
    }
  });
}

const bgNoiseBtn = document.getElementById('bgNoiseBtn');
const bgNoiseMenu = document.getElementById('bgNoiseMenu');

if(bgNoiseBtn && bgNoiseMenu){
  bgNoiseBtn.addEventListener('click', () => {
    const isOpen = bgNoiseMenu.classList.toggle('show');
    bgNoiseBtn.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
  });

  // Click outside to close menu
  document.addEventListener('click', (e) => {
    if (!bgNoiseMenu.contains(e.target) && !bgNoiseBtn.contains(e.target)) {
      bgNoiseMenu.classList.remove('show');
      bgNoiseBtn.setAttribute('aria-pressed', 'false');
    }
  });

  bgNoiseMenu.querySelectorAll('li').forEach(item => {
    item.addEventListener('click', () => {
      const soundFile = item.dataset.sound;

      if (state.backgroundNoise && state.currentSound === soundFile) {
        stopBackgroundNoise();
        state.currentSound = null;
        bgNoiseMenu.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
        return;
      }

      playBackgroundNoise(soundFile);
      state.currentSound = soundFile;

      bgNoiseMenu.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
      item.classList.add('selected');
    });
  });
}


function playBackgroundNoise(file) {
  if (!file) return;

  if (bgNoiseAudio) {
    bgNoiseAudio.pause();
    bgNoiseAudio = null;
  }
  bgNoiseAudio = new Audio(file);
  bgNoiseAudio.loop = true;
  
  // Set volume from slider or default 0.5
  const vol = volumeSlider ? parseFloat(volumeSlider.value) : 0.5;
  bgNoiseAudio.volume = vol;

  bgNoiseAudio.play();
}

