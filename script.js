const MAX_FILES = 15;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
let files = [];
let isProcessingFiles = false;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filelist = document.getElementById('filelist');
const processBtn = document.getElementById('processBtn');
const statusEl = document.getElementById('status');
const resultCard = document.getElementById('resultCard');
const resultEl = document.getElementById('result');
const resetBtn = document.getElementById('resetBtn');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function handleFiles(list){
  if (isProcessingFiles) return;
  isProcessingFiles = true;
  const incoming = Array.from(list);
  let size = files.reduce((a,b)=>a+(b.size||0),0);

  for (const f of incoming){
    if (files.length >= MAX_FILES){ setStatus(`Max ${MAX_FILES} fájl.`, true); break; }
    if (!ACCEPTED.includes(f.type)){ setStatus(`${f.name} nem támogatott.`, true); continue; }
    if (size + f.size > MAX_TOTAL_SIZE){ setStatus(`${f.name} túl nagy.`, true); continue; }
    size += f.size;
    readFile(f);
  }
  fileInput.value = '';
  isProcessingFiles = false;
  renderList();
}

function readFile(f) {
  const reader = new FileReader();
  reader.onload = async () => {
    const img = new Image();
    img.src = reader.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_WIDTH = 1000;
      const MAX_HEIGHT = 1000;

      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      files.push({
        id: crypto.randomUUID(),
        name: f.name,
        type: 'image/jpeg',
        base64: canvas.toDataURL('image/jpeg', 0.7),
        size: f.size
      });
      renderList();
    };
  };
  reader.readAsDataURL(f);
}

function renderList(){
  filelist.innerHTML = '';
  files.forEach(f => {
    const el = document.createElement('div');
    el.className = 'chip';
    el.innerHTML = `<span>${f.name}</span><button onclick="removeFile('${f.id}')">×</button>`;
    filelist.appendChild(el);
  });
  processBtn.disabled = files.length === 0;
}

window.removeFile = (id) => { files = files.filter(f => f.id !== id); renderList(); };
function setStatus(msg, error=false){ statusEl.textContent = msg; statusEl.className = 'status' + (error ? ' error' : ''); }

processBtn.addEventListener('click', async () => {
  if (!files.length) return;
  processBtn.disabled = true;
  
  let finalCim = "-";
  let finalDatum = "-";

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    setStatus(`Fájl feldolgozása (${i + 1}/${files.length}): ${f.name}...`, false);

    const content = [
      { type: 'image_url', image_url: { url: f.base64 } },
      { type: "text", text: "Elemezd a képet és adj egy JSON objektumot válaszként 'cim' és 'birtokbaadas_datuma' kulcsokkal. Csak nyers JSON szöveget adj vissza, markdown kódblokk jelölések nélkül!" }
    ];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ messages: [{ role: 'user', content }] })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Hiba történt a(z) ${f.name} feldolgozásakor.`);
      }

      const rawText = data.reply || "";
      const cleanText = rawText.replace(/```json|```/g, '').trim();
      const json = JSON.parse(cleanText.slice(cleanText.indexOf('{'), cleanText.lastIndexOf('}') + 1));
      
      if (json.cim && json.cim !== "-") finalCim = json.cim;
      if (json.birtokbaadas_datuma && json.birtokbaadas_datuma !== "-") finalDatum = json.birtokbaadas_datuma;

    } catch (e) {
      setStatus(`Hiba a(z) ${f.name} fájlnál: ${e.message}`, true);
      processBtn.disabled = false;
      return;
    }
  }

  renderResult({ cim: finalCim, birtokbaadas_datuma: finalDatum });
  resultCard.hidden = false;
  setStatus("Összes fájl sikeresen feldolgozva!", false);
  processBtn.disabled = false;
});

function renderResult(data){
  resultEl.innerHTML = `
    <div><b>Cím:</b> ${data.cim || '-'}</div>
    <div><b>Dátum:</b> ${data.birtokbaadas_datuma || '-'}</div>
  `;
}

resetBtn.addEventListener('click', () => { files = []; renderList(); resultCard.hidden = true; setStatus('', false); });
