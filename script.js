import Chart from "chart.js/auto";

let isTeacherMode = false;
let fertilizerOn = true;
let waterOn = true;
let currentMonth = 0;
const maxMonths = 150;
let noFertHeights = [5];
let withFertHeights = [5];
let growthChart = null;
let exampleChart = null;
let narrationUtterance = null;
let isSpeaking = false;

const simulatorNarrationText = "歡迎嚟到植物模擬器！左邊係無肥料樹，右邊係有肥料樹。試下加肥料同加水，睇下植物會長得點樣呀！";
const simulatorNarrationTextEn = "Welcome to the plant simulator! On the left is the tree without fertilizer; on the right is the tree with fertilizer. Try turning fertilizer and water on and off to see how the plants grow.";
const teachingNarrationText = "方塊圖係用嚟比較資料嘅好工具。橫軸代表月份，縱軸代表高度。藍色方塊係無肥料樹，綠色方塊係有肥料樹。有肥料樹通常會長得更高更快！";
const teachingNarrationTextEn = "Bar charts are a great way to compare data. The horizontal axis shows months, and the vertical axis shows height. The blue bars are the tree without fertilizer, the green bars are with fertilizer. Trees with fertilizer usually grow taller and faster.";

// UI elements
const modeBtn = document.getElementById('mode-btn');
const modeText = document.getElementById('mode-text');
const fertBtn = document.getElementById('fert-btn');
const waterBtn = document.getElementById('water-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const narrationBtn = document.getElementById('narration-btn');
const narrationStatus = document.getElementById('narration-status');
const narrationEnBtn = document.getElementById('narration-en-btn');
const narrationStatusEn = document.getElementById('narration-status-en');
const teachBtn = document.getElementById('teaching-page-btn');
const backToSimBtn = document.getElementById('back-to-sim');
const goFeedbackBtn = document.getElementById('go-feedback');
const submitFeedbackBtn = document.getElementById('submit-feedback');
const playTeachingNarrationBtn = document.getElementById('play-teaching-narration');
const playTeachingNarrationEnBtn = document.getElementById('play-teaching-narration-en');
const textSizeSlider = document.getElementById('text-size-slider');
const textSizeValue = document.getElementById('text-size-value');
const exampleCanvas = document.getElementById('example-chart');
const growthCanvas = document.getElementById('growth-chart');
const monthNumberEl = document.getElementById('month-number');
const encourageStars = document.getElementById('encourage-stars');

const studentNameInput = document.getElementById('student-name');
const feedbackTextInput = document.getElementById('feedback-text');
const teacherTool = document.getElementById('teacher-tool');
const exportCsvBtn = document.getElementById('export-csv');
const clearFeedbacksBtn = document.getElementById('clear-feedbacks');
const feedbackTbody = document.getElementById('feedback-tbody');
const completeTaskBtn = document.getElementById('complete-task');
const restartSimBtn = document.getElementById('restart-sim');

let feedbacks = JSON.parse(localStorage.getItem('plantFeedbacks') || '[]');

// ---------- helpers ----------
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  if (pageId === 'teaching-page' && !exampleChart) createExampleChart();
  if (pageId === 'feedback-page' && isTeacherMode) {
    teacherTool.classList.remove('hidden');
    renderFeedbackTable();
  }
}

function toggleMode() {
  isTeacherMode = !isTeacherMode;
  if (isTeacherMode) {
    modeBtn.classList.remove('bg-emerald-600'); modeBtn.classList.add('bg-amber-600');
    modeText.innerHTML = `教師模式 <span class="text-2xl">👩‍🏫</span>`;
    if (document.getElementById('feedback-page').classList.contains('active')) {
      teacherTool.classList.remove('hidden'); renderFeedbackTable();
    }
  } else {
    modeBtn.classList.remove('bg-amber-600'); modeBtn.classList.add('bg-emerald-600');
    modeText.innerHTML = `學生模式 <span class="text-2xl">👨‍🎓</span>`;
    teacherTool.classList.add('hidden');
  }
}

function updateTrees() {
  const noFertHeightCm = noFertHeights[noFertHeights.length - 1];
  const withFertHeightCm = withFertHeights[withFertHeights.length - 1];

  // Base font size for emoji (keeps them readable on small screens)
  const baseFontSize = 64; // px

  // Compute a smooth scale factor from height (more height => larger tree)
  // scale = 1 at 5cm, grows up to ~3.5 for very tall plants; clamped for stability
  const computeScale = (cm) => {
    const normalized = Math.max(0, (cm - 5) / 300); // every 300cm increases scale by ~1
    return Math.min(3.5, 1 + normalized * 2.5);
  };

  const noScale = computeScale(noFertHeightCm);
  const withScale = computeScale(withFertHeightCm);

  const noTreeEl = document.getElementById('no-fert-tree');
  const withTreeEl = document.getElementById('with-fert-tree');

  // Apply horizontal centering and bottom alignment via transform; animate smoothly
  noTreeEl.style.fontSize = `${baseFontSize}px`;
  withTreeEl.style.fontSize = `${baseFontSize}px`;

  noTreeEl.style.transform = `translateY(0) scale(${noScale})`;
  withTreeEl.style.transform = `translateY(0) scale(${withScale})`;
  noTreeEl.style.transformOrigin = '50% 100%';
  withTreeEl.style.transformOrigin = '50% 100%';

  // Update numeric labels
  document.getElementById('no-fert-height').innerHTML =
    `${noFertHeightCm} 厘米 ${noFertHeightCm >= 100 ? `(${Math.round(noFertHeightCm/100)} 米)` : ''}`;
  document.getElementById('with-fert-height').innerHTML =
    `${withFertHeightCm} 厘米 ${withFertHeightCm >= 100 ? `(${Math.round(withFertHeightCm/100)} 米)` : ''}`;

  // Encourage stars when difference is notable or every 5 months
  if ((withFertHeightCm - noFertHeightCm > 30) || (currentMonth % 5 === 0 && currentMonth > 0)) {
    encourageStars.classList.remove('hidden');
    setTimeout(() => encourageStars.classList.add('hidden'), 3000);
  }
}

function updateChart() {
  if (growthChart) growthChart.destroy();
  const labels = Array.from({length: noFertHeights.length}, (_, i) => `第${i}月`);
  growthChart = new Chart(growthCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '無肥料樹', data: noFertHeights, backgroundColor: '#3b82f6', borderColor: '#1e40af', borderWidth: 2, barThickness: 18 },
        { label: '有肥料樹', data: withFertHeights, backgroundColor: '#10b981', borderColor: '#166534', borderWidth: 2, barThickness: 18 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 16 }, padding: 20 } } },
      scales: {
        x: { title: { display: true, text: '月份', font: { size: 18 } }, grid: { color: '#a3e4c3' } },
        y: { title: { display: true, text: '高度（厘米）', font: { size: 18 } }, beginAtZero: true, grid: { color: '#a3e4c3' } }
      },
      animation: { duration: 1200 }
    }
  });
}

// ---------- controls ----------
function nextMonth() {
  if (currentMonth >= maxMonths) { alert('已經到達150個月上限！可返回模擬器重新開始。'); return; }
  currentMonth++;
  monthNumberEl.textContent = currentMonth;

  const baseGrowth = waterOn ? 4 + Math.random() * 3 : 2 + Math.random() * 2;
  const noFertGrowth = Math.round(baseGrowth);
  const newNoFert = noFertHeights[noFertHeights.length - 1] + noFertGrowth;
  noFertHeights.push(Math.min(1500, newNoFert));

  const fertExtra = fertilizerOn ? 5 + Math.random() * 5 : 0;
  const withFertGrowth = Math.round(baseGrowth + fertExtra);
  const newWithFert = withFertHeights[withFertHeights.length - 1] + withFertGrowth;
  withFertHeights.push(Math.min(1500, newWithFert));

  updateTrees();
  updateChart();
  updateTrees();
}

function toggleFertilizer() {
  fertilizerOn = !fertilizerOn;
  const status = document.getElementById('fert-status');
  status.textContent = fertilizerOn ? '加肥料：開 🌿' : '加肥料：關';
  status.parentElement.style.backgroundColor = fertilizerOn ? '#a7f3d0' : '#e2e8f0';
}

function toggleWater() {
  waterOn = !waterOn;
  const status = document.getElementById('water-status');
  status.textContent = waterOn ? '加水：開 💧' : '加水：關';
  status.parentElement.style.backgroundColor = waterOn ? '#bae6fd' : '#e2e8f0';
}

let narrationLang = 'zh-HK'; // 'zh-HK' or 'en-US'

// Generic play function used by both language buttons
function playNarrationLang(lang, statusEl, text) {
  const synth = window.speechSynthesis;
  if (isSpeaking) {
    synth.cancel();
    isSpeaking = false;
    // reset both status displays
    narrationStatus.textContent = '廣東話旁白';
    narrationStatusEn.textContent = 'English narration';
    return;
  }

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = lang === 'en-US' ? 1.0 : 0.95;
  u.pitch = 1.05;
  synth.speak(u);
  isSpeaking = true;
  statusEl.innerHTML = (lang === 'en-US') ? 'English narration: Playing ⏹️' : '廣東話旁白：播放 ⏹️';

  u.onend = () => {
    isSpeaking = false;
    // restore both labels
    narrationStatus.textContent = '廣東話旁白';
    narrationStatusEn.textContent = 'English narration';
  };
}

// Cantonese narration button plays Cantonese
narrationBtn.addEventListener('click', (e) => {
  // Ctrl / Meta click toggles the default language flag (legacy support) when not speaking
  if ((e.ctrlKey || e.metaKey) && !isSpeaking) {
    narrationLang = narrationLang === 'zh-HK' ? 'en-US' : 'zh-HK';
    narrationStatus.textContent = narrationLang === 'zh-HK' ? '廣東話旁白' : 'English narration';
    return;
  }
  playNarrationLang('zh-HK', narrationStatus, simulatorNarrationText);
});

// English narration button plays English (uses English text)
narrationEnBtn.addEventListener('click', () => {
  // If the English simulator text is empty, fallback to a short message
  const text = simulatorNarrationTextEn || "Welcome to the plant simulator. Left: no fertilizer. Right: with fertilizer.";
  playNarrationLang('en-US', narrationStatusEn, text);
});

function playTeachingNarration() {
  const synth = window.speechSynthesis;
  // toggle if already speaking
  if (synth.speaking) { synth.cancel(); return; }
  const u = new SpeechSynthesisUtterance(teachingNarrationText);
  u.lang = 'zh-HK'; u.rate = 0.95;
  playButtonWhileSpeaking(synth, u, playTeachingNarrationBtn, '播放廣東話教學旁白', '廣東話：播放 ⏹️');
}

function playTeachingNarrationEn() {
  const synth = window.speechSynthesis;
  if (synth.speaking) { synth.cancel(); return; }
  const u = new SpeechSynthesisUtterance(teachingNarrationTextEn || "Bar charts are a great way to compare data. The horizontal axis shows months, and the vertical axis shows height.");
  u.lang = 'en-US'; u.rate = 1.0;
  playButtonWhileSpeaking(synth, u, playTeachingNarrationEnBtn, 'Play English teaching narration', 'English: Playing ⏹️');
}

// small helper to toggle button labels while speaking
function playButtonWhileSpeaking(synth, utterance, buttonEl, idleLabel, playingLabel) {
  // If already speaking, cancel and restore labels (handled above)
  buttonEl.innerText = playingLabel;
  synth.speak(utterance);
  utterance.onend = () => {
    buttonEl.innerText = idleLabel;
  };
  utterance.onerror = () => {
    buttonEl.innerText = idleLabel;
  };
}

function adjustTextSize(value) {
  textSizeValue.textContent = `${value}px`;
  document.getElementById('teaching-content').style.fontSize = `${value}px`;
}

// ---------- example chart ----------
function createExampleChart() {
  exampleChart = new Chart(exampleCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['第0月','第1月','第2月','第3月','第4月'],
      datasets: [
        { label: '無肥料樹', data: [5,9,14,19,24], backgroundColor: '#3b82f6', barThickness: 22 },
        { label: '有肥料樹', data: [5,13,22,33,46], backgroundColor: '#10b981', barThickness: 22 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, title: { display: true, text: '高度（厘米）' } } } }
  });
}

// ---------- feedback ----------
function submitFeedback() {
  const name = studentNameInput.value.trim() || '匿名學生';
  const comment = feedbackTextInput.value.trim();
  if (!comment) { alert('請輸入意見先呀！'); return; }
  feedbacks.push({ name, comment, date: new Date().toLocaleString('zh-HK') });
  localStorage.setItem('plantFeedbacks', JSON.stringify(feedbacks));
  alert('多謝你的意見！已儲存。');
  feedbackTextInput.value = ''; studentNameInput.value = '';
  if (isTeacherMode) renderFeedbackTable();
  showPage('completion-page');
}

function renderFeedbackTable() {
  feedbackTbody.innerHTML = '';
  if (feedbacks.length === 0) {
    feedbackTbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-emerald-400">暫無回覆</td></tr>`;
    return;
  }
  feedbacks.forEach(fb => {
    const tr = document.createElement('tr'); tr.className = 'hover:bg-emerald-50';
    tr.innerHTML = `<td class="px-6 py-4">${fb.name}</td><td class="px-6 py-4">${fb.comment}</td><td class="px-6 py-4 text-sm text-emerald-500">${fb.date}</td>`;
    feedbackTbody.appendChild(tr);
  });
}

function exportCSV() {
  if (feedbacks.length === 0) return alert('暫無資料可匯出');
  let csv = '姓名,意見,日期\n';
  feedbacks.forEach(fb => { csv += `"${fb.name.replace(/"/g,'""')}","${fb.comment.replace(/"/g,'""')}","${fb.date}"\n`; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = '植物模擬器_學生回饋.csv'; link.click();
}

function clearFeedbacks() {
  if (!confirm('確定要清除所有回覆嗎？此動作無法還原！')) return;
  feedbacks = []; localStorage.setItem('plantFeedbacks', JSON.stringify([])); renderFeedbackTable();
}

function resetAndReturnToSimulator() {
  currentMonth = 0; noFertHeights = [5]; withFertHeights = [5]; fertilizerOn = true; waterOn = true;
  monthNumberEl.textContent = '0';
  document.getElementById('fert-status').textContent = '加肥料：開 🌿 / Fertilizer: ON';
  document.getElementById('water-status').textContent = '加水：開 💧 / Water: ON';
  updateTrees(); updateChart(); showPage('simulator-page');
}

// ---------- init ----------
function initializeApp() {
  updateTrees(); updateChart();
  console.log('%c🌱 植物模擬器 已成功載入！', 'color:#10b981; font-size:14px; font-weight:bold');
}

// ---------- event bindings ----------
modeBtn.addEventListener('click', toggleMode);
fertBtn.addEventListener('click', toggleFertilizer);
waterBtn.addEventListener('click', toggleWater);
nextMonthBtn.addEventListener('click', nextMonth);

teachBtn.addEventListener('click', () => showPage('teaching-page'));
backToSimBtn.addEventListener('click', () => showPage('simulator-page'));
goFeedbackBtn.addEventListener('click', () => showPage('feedback-page'));
submitFeedbackBtn.addEventListener('click', submitFeedback);
playTeachingNarrationBtn.addEventListener('click', playTeachingNarration);
playTeachingNarrationEnBtn.addEventListener('click', playTeachingNarrationEn);
textSizeSlider.addEventListener('input', (e) => adjustTextSize(e.target.value));
exportCsvBtn.addEventListener('click', exportCSV);
clearFeedbacksBtn.addEventListener('click', clearFeedbacks);
completeTaskBtn.addEventListener('click', () => showPage('completion-page'));
restartSimBtn.addEventListener('click', resetAndReturnToSimulator);

// left ribbon bindings: wire each ribbon button to showPage and reflect active state
const ribbonButtons = document.querySelectorAll('.left-ribbon .lr-btn');
ribbonButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.getAttribute('data-page');
    showPage(page);
    // update active state
    ribbonButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // ensure teacher tool visibility if navigating to feedback as teacher
    if (page === 'feedback-page' && isTeacherMode) {
      teacherTool.classList.remove('hidden'); renderFeedbackTable();
    }
  });
});
// set initial active ribbon button
const initialBtn = document.querySelector('.left-ribbon .lr-btn[data-page="simulator-page"]');
if (initialBtn) initialBtn.classList.add('active');

window.addEventListener('load', initializeApp);