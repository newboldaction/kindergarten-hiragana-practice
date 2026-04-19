// 拗音の小文字（前の文字と結合して1セットにする）
const SMALL_KANA_COMBO = new Set(['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']);

/**
 * テキスト入力を単語の配列に分割
 */
function parseInput(text) {
  return text
    .split(/[\n,、]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
}

/**
 * ひらがな文字かどうか判定（長音符ーも許可）
 */
function isHiragana(str) {
  return /^[\u3040-\u309F\u30FC]+$/.test(str);
}

/**
 * 単語を練習単位の文字配列に分解（拗音は1セット）
 */
function extractCharacters(word) {
  const normalized = word.normalize('NFC');
  const chars = [];
  let i = 0;
  while (i < normalized.length) {
    if (i + 1 < normalized.length && SMALL_KANA_COMBO.has(normalized[i + 1])) {
      chars.push(normalized[i] + normalized[i + 1]);
      i += 2;
    } else {
      chars.push(normalized[i]);
      i += 1;
    }
  }
  return chars;
}

/**
 * マス目を1つ生成
 */
function createSquare(char, type) {
  const sq = document.createElement('div');
  sq.className = `square ${type}`;
  if (char) {
    sq.textContent = char;
    if (char.length > 1) {
      sq.classList.add('combo');
    }
  }
  return sq;
}

/**
 * 1文字分の練習行を生成
 * お手本(1) + なぞり(4) + 空マス(1) = 6マス
 */
function createPracticeRow(char) {
  const row = document.createElement('div');
  row.className = 'practice-row';

  const label = document.createElement('div');
  label.className = 'row-label';
  label.textContent = char;
  if (char.length > 1) label.style.fontSize = '0.8cm';
  row.appendChild(label);

  const squares = document.createElement('div');
  squares.className = 'practice-squares';

  // お手本 x1
  squares.appendChild(createSquare(char, 'model'));
  // なぞり書き x4
  squares.appendChild(createSquare(char, 'tracing'));
  squares.appendChild(createSquare(char, 'tracing'));
  squares.appendChild(createSquare(char, 'tracing'));
  squares.appendChild(createSquare(char, 'tracing'));
  // 空マス x1
  squares.appendChild(createSquare('', 'empty'));

  row.appendChild(squares);
  return row;
}

/**
 * 練習シート全体を生成
 */
function generateSheet(words) {
  const content = document.getElementById('sheet-content');
  content.innerHTML = '';

  words.forEach(word => {
    const section = document.createElement('section');
    section.className = 'word-section';

    const header = document.createElement('div');
    header.className = 'word-header';
    header.textContent = word;
    section.appendChild(header);

    const characters = extractCharacters(word);
    characters.forEach(char => {
      section.appendChild(createPracticeRow(char));
    });

    content.appendChild(section);
  });
}

/**
 * エラーメッセージの表示/非表示
 */
function showError(msg) {
  const el = document.getElementById('error-message');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-message').classList.add('hidden');
}

// ===== 履歴機能（localStorage、個人別・直近5件） =====
const HISTORY_PREFIX = 'hiragana_history_';
const HISTORY_MAX = 5;
const LAST_USER_KEY = 'hiragana_last_user';

function getHistoryKey(userName) {
  return HISTORY_PREFIX + (userName || '_default');
}

function getCurrentUser() {
  return document.getElementById('user-name').value.trim();
}

function loadHistory() {
  const key = getHistoryKey(getCurrentUser());
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(words) {
  const userName = getCurrentUser();
  const key = getHistoryKey(userName);
  const history = loadHistory();
  const entry = {
    words: words,
    date: new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  };
  history.unshift(entry);
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  localStorage.setItem(key, JSON.stringify(history));
  if (userName) localStorage.setItem(LAST_USER_KEY, userName);
}

/**
 * 印刷日付を設定（西暦）
 */
function updatePrintDate() {
  const el = document.getElementById('print-date');
  const now = new Date();
  el.textContent = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
}

function renderHistory(onSelect) {
  const history = loadHistory();
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');

  if (history.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = '';

  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const wordsSpan = document.createElement('span');
    wordsSpan.className = 'history-words';
    wordsSpan.textContent = entry.words.join('、');

    const dateSpan = document.createElement('span');
    dateSpan.className = 'history-date';
    dateSpan.textContent = entry.date;

    li.appendChild(wordsSpan);
    li.appendChild(dateSpan);
    li.addEventListener('click', () => onSelect(entry.words));
    list.appendChild(li);
  });
}

// ===== イベントリスナー =====
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('word-input');
  const userName = document.getElementById('user-name');
  const generateBtn = document.getElementById('generate-btn');
  const printBtn = document.getElementById('print-btn');
  const backBtn = document.getElementById('back-btn');
  const inputScreen = document.getElementById('input-screen');
  const practiceSheet = document.getElementById('practice-sheet');

  // 前回の名前を復元
  const lastUser = localStorage.getItem(LAST_USER_KEY);
  if (lastUser) userName.value = lastUser;

  generateBtn.addEventListener('click', () => {
    hideError();
    const words = parseInput(input.value);

    if (words.length === 0) {
      showError('ことばを いれてね');
      return;
    }

    const invalidWords = words.filter(w => !isHiragana(w));
    if (invalidWords.length > 0) {
      showError(`ひらがなで にゅうりょく してね: 「${invalidWords.join('」「')}」`);
      return;
    }

    saveToHistory(words);
    updatePrintDate();
    generateSheet(words);
    inputScreen.classList.add('hidden');
    practiceSheet.classList.remove('hidden');
  });

  printBtn.addEventListener('click', () => {
    updatePrintDate();
    window.print();
  });

  backBtn.addEventListener('click', () => {
    practiceSheet.classList.add('hidden');
    inputScreen.classList.remove('hidden');
    renderHistory(selectFromHistory);
  });

  // 名前が変わったら履歴を切り替え
  userName.addEventListener('input', () => {
    renderHistory(selectFromHistory);
  });

  // 履歴クリック時：入力欄にセットして即生成
  function selectFromHistory(words) {
    input.value = words.join('、');
    updatePrintDate();
    generateSheet(words);
    inputScreen.classList.add('hidden');
    practiceSheet.classList.remove('hidden');
  }

  // 初期表示時に履歴を描画
  renderHistory(selectFromHistory);
});
