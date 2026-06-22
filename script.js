// ═══════════════════════════════════════════
// 상태
// ═══════════════════════════════════════════
let currentTab = 'calendar';
let selectedDate = todayStr();
let calYear, calMonth;
let todos = loadTodos();

// 타이머
let timerTotal = 25 * 60;
let timerLeft  = 25 * 60;
let timerInterval = null;
let timerRunning = false;
let timerStarted = false;

// 음성
let recognition = null;
let isRecording = false;

// ═══════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
}
function p2(n) { return String(n).padStart(2,'0'); }
function formatTime(s) { return `${p2(Math.floor(s/60))}:${p2(s%60)}`; }
function loadTodos() { try { return JSON.parse(localStorage.getItem('sh-todos') || '{}'); } catch { return {}; } }
function saveTodos() { localStorage.setItem('sh-todos', JSON.stringify(todos)); }

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// ═══════════════════════════════════════════
// 탭 전환
// ═══════════════════════════════════════════
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + tab));
}

// ═══════════════════════════════════════════
// 배경 이미지
// ═══════════════════════════════════════════
function openBgPicker() {
  document.getElementById('bg-input').click();
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('bg-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const overlay = document.getElementById('bg-overlay');
      const blur = document.getElementById('bg-blur');
      overlay.style.backgroundImage = `url(${ev.target.result})`;
      overlay.classList.add('active');
      blur.classList.add('active');
      localStorage.setItem('sh-bg', ev.target.result);
    };
    reader.readAsDataURL(file);
  });

  // 저장된 배경 복원
  const savedBg = localStorage.getItem('sh-bg');
  if (savedBg) {
    const overlay = document.getElementById('bg-overlay');
    overlay.style.backgroundImage = `url(${savedBg})`;
    overlay.classList.add('active');
    document.getElementById('bg-blur').classList.add('active');
  }

  initCalendar();
  initTimer();
  initVoice();
  renderTodoForDate(selectedDate);
});

// ═══════════════════════════════════════════
// 캘린더
// ═══════════════════════════════════════════
function initCalendar() {
  const today = new Date();
  calYear = today.getFullYear();
  calMonth = today.getMonth();
  renderCalendar();
}

function renderCalendar() {
  const first = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = first.getDay();
  const todayS = todayStr();

  document.getElementById('cal-month-title').textContent =
    `${calYear}년 ${calMonth + 1}월`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  ['일','월','화','수','목','금','토'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-name';
    el.textContent = d;
    grid.appendChild(el);
  });

  // 이전달 빈칸
  const prevLast = new Date(calYear, calMonth, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const el = document.createElement('div');
    el.className = 'cal-day other-month';
    el.textContent = prevLast - i;
    grid.appendChild(el);
  }

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${calYear}-${p2(calMonth+1)}-${p2(d)}`;
    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = d;
    if (dateStr === todayS) el.classList.add('today');
    if (dateStr === selectedDate) el.classList.add('selected');
    if (todos[dateStr] && todos[dateStr].length > 0) el.classList.add('has-todo');
    el.addEventListener('click', () => {
      selectedDate = dateStr;
      renderCalendar();
      renderTodoForDate(dateStr);
    });
    grid.appendChild(el);
  }

  // 다음달 빈칸
  const total = startDow + lastDay;
  const remain = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remain; d++) {
    const el = document.createElement('div');
    el.className = 'cal-day other-month';
    el.textContent = d;
    grid.appendChild(el);
  }
}

function renderTodoForDate(dateStr) {
  const list = todos[dateStr] || [];
  const container = document.getElementById('todo-list');
  const label = document.getElementById('todo-date-label');

  const [y, m, d] = dateStr.split('-');
  label.textContent = `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-msg">공부 목표를 추가해봐요 ✏️</div>';
    return;
  }

  container.innerHTML = list.map((item, i) => `
    <div class="todo-item ${item.done ? 'done' : ''}">
      <button class="todo-check" onclick="toggleTodo('${dateStr}', ${i})">${item.done ? '✓' : ''}</button>
      <span class="todo-text">${item.text}</span>
      <button class="todo-del" onclick="deleteTodo('${dateStr}', ${i})">✕</button>
    </div>
  `).join('');
}

function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;
  if (!todos[selectedDate]) todos[selectedDate] = [];
  todos[selectedDate].push({ text, done: false });
  saveTodos();
  input.value = '';
  renderTodoForDate(selectedDate);
  renderCalendar();
}

function toggleTodo(dateStr, idx) {
  todos[dateStr][idx].done = !todos[dateStr][idx].done;
  saveTodos();
  renderTodoForDate(dateStr);
}

function deleteTodo(dateStr, idx) {
  todos[dateStr].splice(idx, 1);
  saveTodos();
  renderTodoForDate(dateStr);
  renderCalendar();
}

// ═══════════════════════════════════════════
// AI 추천 탭
// ═══════════════════════════════════════════
async function fetchAIRecommend() {
  const todayTodos = todos[todayStr()] || [];
  const pending = todayTodos.filter(t => !t.done);

  const box = document.getElementById('ai-result');
  const dot = document.getElementById('ai-dot');

  if (pending.length === 0) {
    box.textContent = '오늘 등록된 공부 목표가 없어요. 캘린더에서 오늘 날짜에 목표를 추가해줘!';
    return;
  }

  box.textContent = 'AI가 분석 중이에요...';
  box.classList.add('loading');
  dot.classList.add('pulse');

  const goalList = pending.map((t, i) => `${i+1}. ${t.text}`).join('\n');
  const prompt = `고3 학생의 오늘 공부 목표야:\n${goalList}\n\n효율적인 공부 순서를 추천하고, 각 항목마다 왜 그 순서인지 한 줄로 설명해줘. 친근하고 간결하게, 이모지 조금 써서 답해줘.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    box.textContent = data.content?.[0]?.text || '추천을 불러오지 못했어요.';
  } catch {
    box.textContent = 'AI 연결에 문제가 생겼어요. 잠시 후 다시 시도해줘.';
  }
  box.classList.remove('loading');
  dot.classList.remove('pulse');
}

// ═══════════════════════════════════════════
// 타이머
// ═══════════════════════════════════════════
const RING_R = 60;
const RING_C = 2 * Math.PI * RING_R;

function initTimer() {
  const fill = document.getElementById('ring-fill');
  fill.style.strokeDasharray = RING_C;
  fill.style.strokeDashoffset = '0';
  updateTimerDisplay();
}

function updateTimerDisplay() {
  document.getElementById('timer-display').textContent = formatTime(timerLeft);
  const fill = document.getElementById('ring-fill');
  const pct = timerLeft / timerTotal;
  fill.style.strokeDashoffset = RING_C * (1 - pct);
  const disp = document.getElementById('timer-display');
  disp.classList.toggle('warn', timerLeft <= 60 && timerRunning);
}

function setPreset(min) {
  if (timerRunning) return;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('t-min').value = min;
  document.getElementById('t-sec').value = 0;
  timerTotal = min * 60;
  timerLeft = timerTotal;
  timerStarted = false;
  updateTimerDisplay();
}

function getInputSecs() {
  const m = parseInt(document.getElementById('t-min').value) || 0;
  const s = parseInt(document.getElementById('t-sec').value) || 0;
  return m * 60 + s;
}

function timerStart() {
  if (timerRunning) return;
  if (!timerStarted) {
    timerTotal = getInputSecs();
    timerLeft = timerTotal;
    timerStarted = true;
  }
  if (timerLeft <= 0) return;
  timerRunning = true;
  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-pause').disabled = false;
  timerInterval = setInterval(() => {
    timerLeft--;
    updateTimerDisplay();
    if (timerLeft <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerStarted = false;
      document.getElementById('btn-start').disabled = false;
      document.getElementById('btn-pause').disabled = true;
      onTimerDone();
    }
  }, 1000);
}

function timerPause() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-pause').disabled = true;
}

function timerReset() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerStarted = false;
  timerTotal = getInputSecs();
  timerLeft = timerTotal;
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-pause').disabled = true;
  updateTimerDisplay();
  document.getElementById('timer-summary').style.display = 'none';
}

async function onTimerDone() {
  toast('⏰ 시간 종료!');
  const section = document.getElementById('timer-summary');
  const box = document.getElementById('timer-summary-result');
  section.style.display = 'block';
  box.textContent = 'AI가 오늘 공부를 정리하는 중...';
  box.classList.add('loading');

  const todayTodos = todos[todayStr()] || [];
  const done = todayTodos.filter(t => t.done).map(t => t.text);
  const left = todayTodos.filter(t => !t.done).map(t => t.text);
  const totalMin = Math.floor(timerTotal / 60);

  const prompt = `고3 학생이 오늘 ${totalMin}분 자습을 마쳤어.\n완료: ${done.length > 0 ? done.join(', ') : '없음'}\n미완료: ${left.length > 0 ? left.join(', ') : '없음'}\n\n1. 오늘 공부 요약 (잘한 점, 아쉬운 점)\n2. 내일 공부 계획 추천\n\n친근하고 따뜻하게, 간결하게 이모지 써서 답해줘.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    box.textContent = data.content?.[0]?.text || '요약을 불러오지 못했어요.';
  } catch {
    box.textContent = 'AI 연결에 문제가 생겼어요.';
  }
  box.classList.remove('loading');
}

// ═══════════════════════════════════════════
// 음성 녹음 (Web Speech API)
// ═══════════════════════════════════════════
function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById('record-hint').textContent = 'Safari에서는 음성 인식이 지원돼요. Chrome은 미지원.';
    document.getElementById('record-btn').disabled = true;
    return;
  }

  recognition = new SR();
  recognition.lang = 'ko-KR';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isRecording = true;
    document.getElementById('record-btn').classList.add('recording');
    document.getElementById('record-btn').textContent = '⏹️';
    document.getElementById('record-hint').textContent = '말하고 있어요... 버튼을 다시 눌러 멈추기';
  };

  let finalText = '';
  recognition.onresult = e => {
    let interim = '';
    finalText = '';
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    document.getElementById('transcript').value = finalText + interim;
  };

  recognition.onend = () => {
    isRecording = false;
    document.getElementById('record-btn').classList.remove('recording');
    document.getElementById('record-btn').textContent = '🎙️';
    document.getElementById('record-hint').textContent = '버튼을 눌러 녹음 시작';
    if (finalText.trim()) {
      document.getElementById('transcript').value = finalText.trim();
    }
  };

  recognition.onerror = e => {
    isRecording = false;
    document.getElementById('record-btn').classList.remove('recording');
    document.getElementById('record-btn').textContent = '🎙️';
    document.getElementById('record-hint').textContent = '오류가 발생했어요. 다시 시도해줘.';
  };
}

function toggleRecord() {
  if (!recognition) return;
  if (isRecording) {
    recognition.stop();
  } else {
    document.getElementById('transcript').value = '';
    document.getElementById('voice-summary').style.display = 'none';
    recognition.start();
  }
}

async function summarizeTranscript() {
  const text = document.getElementById('transcript').value.trim();
  if (!text) { toast('먼저 녹음하거나 텍스트를 입력해줘'); return; }

  const section = document.getElementById('voice-summary');
  const box = document.getElementById('voice-summary-result');
  section.style.display = 'block';
  box.textContent = 'AI가 요약 중...';
  box.classList.add('loading');

  const prompt = `다음은 학생이 공부하면서 음성으로 기록한 내용이야:\n\n"${text}"\n\n핵심 내용을 간결하게 요약하고, 공부에 도움이 될 코멘트를 달아줘. 친근하게 이모지 써서 답해줘.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    box.textContent = data.content?.[0]?.text || '요약을 불러오지 못했어요.';
  } catch {
    box.textContent = 'AI 연결에 문제가 생겼어요.';
  }
  box.classList.remove('loading');
}

// ═══════════════════════════════════════════
// PWA 서비스워커 등록
// ═══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}