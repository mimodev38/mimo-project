const MAX_FILES = 15;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

const ACCEPTED = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf'
];

let files = [];
let isProcessingFiles = false;

/* ===== DOM ===== */
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filelist = document.getElementById('filelist');
const processBtn = document.getElementById('processBtn');
const statusEl = document.getElementById('status');
const resultCard = document.getElementById('resultCard');
const resultEl = document.getElementById('result');
const resetBtn = document.getElementById('resetBtn');

/* ===== DROPZONE ===== */
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag');
});

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', e => handleFiles(e.target.files));

/* ===== FILE HANDLING (STABIL) ===== */
function handleFiles(list){
  if (isProcessingFiles) return;
  isProcessingFiles = true;

  const incoming = Array.from(list);

  let size = files.reduce((a,b)=>a+(b.size||0),0);

  for (const f of incoming){

    if (files.length >= MAX_FILES){
      setStatus(`Max ${MAX_FILES} fájl.`, true);
      break;
    }

    if (!ACCEPTED.includes(f.type)){
      setStatus(`${f.name} nem támogatott.`, true);
      continue;
    }

    if (size + f.size > MAX_TOTAL_SIZE){
      setStatus(`${f.name} túl nagy.`, true);
      continue;
    }

    size += f.size;
    readFile(f);
  }

  fileInput.value = '';
  isProcessingFiles = false;

  renderList();
}

/* ===== BASE64 SAFE ===== */
function readFile(f){
  const reader = new FileReader();

  reader.onload = async () => {
    await new Promise(r => setTimeout(r, 0));

    files.push({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.type,
      base64: reader.result.split(',')[1],
      size: f.size
    });

    renderList();
  };

  reader.onerror = () => setStatus(`Hiba: ${f.name}`, true);

  reader.readAsDataURL(f);
}

/* ===== LIST ===== */
function renderList(){
  filelist.innerHTML = '';

  files.forEach(f => {
    const el = document.createElement('div');
    el.className = 'chip';
    el.innerHTML = `
      <span>${f.name}</span>
      <button onclick="removeFile('${f.id}')">×</button>
    `;
    filelist.appendChild(el);
  });

  processBtn.disabled = files.length === 0;
}

window.removeFile = (id) => {
  files = files.filter(f => f.id !== id);
  renderList();
};

/* ===== STATUS ===== */
function setStatus(msg, error=false){
  statusEl.textContent = msg;
  statusEl.className = 'status' + (error ? ' error' : '');
}

/* ===== FETCH SAFE ===== */
async function safeFetch(url, options){
  const res = await fetch(url, options);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("API nem JSON (Vercel hiba)");
  }

  if (!res.ok) {
    throw new Error(data?.error || "HTTP error");
  }

  return data;
}

/* ===== PROCESS ===== */
processBtn.addEventListener('click', async () => {
  if (!files.length) return;

  processBtn.disabled = true;
  setStatus("Feldolgozás...", false);

  const content = files.map(f => ({
    type: 'image_url',
    image_url: {
      url: `data:${f.type};base64,${f.base64}`
    }
  }));

  content.push({
    type: "text",
    text: "Adj JSON választ"
  });

  try {
    const data = await safeFetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [{ role: 'user', content }]
      })
    });

    const text = data?.content?.[0]?.text;
    if (!text) throw new Error("Üres válasz");

    const clean = text.replace(/```json|```/g,'').trim();
    const json = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}')+1));

    renderResult(json);

    resultCard.hidden = false;

  } catch (e) {
    setStatus(e.message, true);
  }

  processBtn.disabled = false;
});

/* ===== RESULT ===== */
function renderResult(data){
  resultEl.innerHTML = `
    <div><b>Cím:</b> ${data.cim || '-'}</div>
    <div><b>Dátum:</b> ${data.birtokbaadas_datuma || '-'}</div>
  `;
}

/* ===== RESET ===== */
resetBtn.addEventListener('click', () => {
  files = [];
  renderList();
  resultCard.hidden = true;
  setStatus('', false);
});
