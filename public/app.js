let currentAudio = null;

async function speak(text) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error('TTS failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.play();
  } catch(e) {
    console.error('TTS error:', e);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    // 복사 완료 피드백
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = '📋', 1500);
  } catch(e) {
    console.error('Copy failed:', e);
  }
}

function setEx(s) {
  document.getElementById('eng-input').value = s;
  analyze();
}

document.getElementById('eng-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') analyze();
});

async function analyze() {
  const eng = document.getElementById('eng-input').value.trim();
  if (!eng) return;

  const out = document.getElementById('output');
  const btn = document.getElementById('viz-btn');
  btn.disabled = true;
  out.innerHTML = '<div class="loading"><div class="spinner"></div>Translating and analyzing...</div>';

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence: eng })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    render(data);

  } catch(e) {
    out.innerHTML = `<p class="error">Error: ${e.message}</p>`;
  } finally {
    btn.disabled = false;
  }
}

function posClass(pos) {
  const map = {
    verb: 'pos-verb', noun: 'pos-noun', adjective: 'pos-adjective',
    pronoun: 'pos-pronoun', preposition: 'pos-preposition',
    adverb: 'pos-adverb', particle: 'pos-particle'
  };
  return map[pos] || 'pos-particle';
}

function chunkClass(role) {
  const map = {
    predicate: 'chunk-predicate', subject: 'chunk-subject',
    object: 'chunk-object', recipient: 'chunk-recipient'
  };
  return map[role] || 'chunk-other';
}

function render(data) {
  const out = document.getElementById('output');

  const chunksHTML = data.chunks.map(chunk => {
    const wordsHTML = chunk.words.map(w => {
      const details = [
        w.case   !== 'none' ? `<strong>Case:</strong> ${w.case}`     : '',
        w.number !== 'none' ? `<strong>Number:</strong> ${w.number}` : '',
        w.gender !== 'none' ? `<strong>Gender:</strong> ${w.gender}` : '',
        w.person !== 'none' ? `<strong>Person:</strong> ${w.person}` : '',
        w.tense  !== 'none' ? `<strong>Tense:</strong> ${w.tense}`   : '',
      ].filter(Boolean).join('<br>');

      return `
        <div class="word-wrap">
          <div class="word-pill" onclick="speak('${w.slovenian}')" title="click to hear">
            <span class="word-text">${w.slovenian}</span>
            <span class="word-pos ${posClass(w.pos)}">${w.pos}</span>
            <span class="word-sound">🔊</span>
          </div>
          <div class="hover-card">
            <div class="hc-word">${w.slovenian}</div>
            <div class="hc-base">base: <span>${w.base_form}</span></div>
            <div class="hc-meaning">meaning: <span>${w.meaning || ''}</span></div>
            <div class="hc-info">${w.analysis}</div>
            ${details ? `<div class="hc-info" style="margin-top:4px">${details}</div>` : ''}
            <div class="hc-change">${w.change}</div>
          </div>
        </div>`;
    }).join('');

    const label = chunk.role.charAt(0).toUpperCase() + chunk.role.slice(1);
    return `
      <div class="chunk ${chunkClass(chunk.role)}">
        <div class="chunk-label">${label}</div>
        ${wordsHTML}
      </div>`;
  }).join('');

  const notesHTML = (data.grammar_notes || [])
    .map(n => `<span class="rule-pill">${n}</span>`)
    .join('');

  out.innerHTML = `
    <div class="result-area">
      <div class="section-label">English</div>
      <div class="english-display">${data.english}</div>

      <div class="section-label">Slovenian — click each word to hear</div>
      <div class="slovenian-display">
        ${data.slovenian}
        <button class="copy-btn" id="copy-btn" onclick="copyText('${data.slovenian.replace(/'/g, "\\'")}')" title="copy">📋</button>
      </div>
      <button class="listen-btn" onclick="speak('${data.slovenian.replace(/'/g, "\\'")}')">🔊 hear full sentence</button>

      <div class="chunks-row">${chunksHTML}</div>
      ${notesHTML ? `<div class="section-label">Grammar rules fired</div><div class="rule-pills">${notesHTML}</div>` : ''}
    </div>`;
}