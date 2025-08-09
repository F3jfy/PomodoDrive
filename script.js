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
