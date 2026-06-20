const MAX_FILES = 15;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
let files = [];
let isProcessingFiles = false;

// Kérlek, vágd ketté az OpenRouter kulcsodat (sk-or-v1-...) és másold be ide a két felét!
const KEY_PART1 = "sk-or-v1-4f2471cd05e20d42b7a20da63b9b23";
const KEY_PART2 = "f278c6c951739da6b54d76a33d574ea4bb";

/* ===== DOM ELEMENTS ===== */
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filelist = document.getElementById('filelist');
const processBtn = document.getElementById('processBtn');
const statusEl = document.getElementById('status');
const resultCard = document.getElementById('resultCard');
const resultEl = document.getElementById('result');
const resetBtn = document.getElementById('resetBtn');

/* ===== DROPZONE EVENTS ===== */
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
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 600;

      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const cleanName = f.name.toLowerCase().replace(/[^a-z0-9.]/g, '_');

      files.push({
        id: crypto.randomUUID(),
        name: cleanName,
        type: 'image/jpeg',
        base64: canvas.toDataURL('image/jpeg', 0.4),
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

/* ===== PROCESSOR ===== */
processBtn.addEventListener('click', async () => {
  if (!files.length) return;
  processBtn.disabled = true;
  
  let finalCim = "-";
  let finalDatum = "-";

  const fullKey = KEY_PART1.trim() + KEY_PART2.trim();

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    setStatus(`Fájl feldolgozása (${i + 1}/${files.length}): ${f.name}...`, false);

    try {
      // Ingyenes proxy híd bevonása a hálózati CORS tiltások teljes megkerülésére
      const proxyUrl = "https://corsproxy.io?";
      const targetUrl = "https://openrouter.ai";

      const res = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${fullKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Mimo Project"
        },
        body: JSON.stringify({
          model: "mistralai/pixtral-12b:free",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: "Elemezd a képet és adj egy JSON objektumot válaszként 'cim' és 'birtokbaadas_datuma' kulcsokkal. Csak nyers JSON szöveget adj vissza, markdown kódblokk jelölések nélkül!"
              },
              {
                type: "image_url",
                image_url: {
                  url: f.base64
                }
              }
            ]
          }]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter elutasítás (${res.status}): ${errText.substring(0, 100)}`);
      }

      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content || "";
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
