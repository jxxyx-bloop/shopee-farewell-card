// ─── Constants ───
const REFRESH_INTERVAL = 15000; // auto-refresh every 15 seconds

const STICKY_COLORS = [
  {bg:"#FFF9C4",border:"#F9E547",shadow:"rgba(249,229,71,0.3)"},
  {bg:"#F8BBD0",border:"#EC407A",shadow:"rgba(236,64,122,0.3)"},
  {bg:"#C8E6C9",border:"#66BB6A",shadow:"rgba(102,187,106,0.3)"},
  {bg:"#BBDEFB",border:"#42A5F5",shadow:"rgba(66,165,245,0.3)"},
  {bg:"#FFE0B2",border:"#FFA726",shadow:"rgba(255,167,38,0.3)"},
  {bg:"#E1BEE7",border:"#AB47BC",shadow:"rgba(171,71,188,0.3)"},
  {bg:"#B2EBF2",border:"#26C6DA",shadow:"rgba(38,198,218,0.3)"},
  {bg:"#FFCCBC",border:"#FF7043",shadow:"rgba(255,112,67,0.3)"},
];
const EMOJIS = ["❤️","🎉","🥳","👏","🌟","💐","🫶","😢","🍀","🎊","✨","🙏","💪","🤗","🎈","🥂","💛","🦋","🌈","🫡"];
const FONTS = ["'Caveat',cursive","'Patrick Hand',cursive","'Shadows Into Light',cursive","'Indie Flower',cursive"];
const DOODLE_COLORS = ["#333333","#E53935","#1E88E5","#43A047","#FB8C00","#8E24AA","#00ACC1","#F06292"];
const BRUSH_SIZES = [2,4,7];

let notes = [];
let currentView = 'board';
let currentDoodle = null, currentPhoto = null;
let doodleDrawing = false, doodleColor = '#333333', doodleBrushSize = 3, doodleLastPos = null;
let isSaving = false;

// ─── Sanitization Helpers ───

/** Escape HTML special characters to prevent XSS */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/** Validate that a string is a safe data URI (image/*) or empty */
function sanitizeImageSrc(src) {
  if (!src) return null;
  if (typeof src !== 'string') return null;
  // Only allow data: URIs with image MIME types
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/.test(src)) {
    return src;
  }
  return null;
}

// ─── JSONBin Storage ───
function isConfigured() {
  return typeof JSONBIN_BIN_ID !== 'undefined' && JSONBIN_BIN_ID
      && typeof JSONBIN_API_KEY !== 'undefined' && JSONBIN_API_KEY;
}

async function loadNotes() {
  if (!isConfigured()) {
    hideLoader();
    notes = [{id:1,author:"The Team",message:"We'll miss you so much, Eveline! \u{1F49B}\nYou made every day brighter.",colorIdx:0,fontIdx:0,rotation:-2,doodle:null,photo:null}];
    renderNotes();
    return;
  }
  setSyncStatus('saving');
  try {
    const res = await fetch('https://api.jsonbin.io/v3/b/'+JSONBIN_BIN_ID+'/latest',{headers:{'X-Access-Key':JSONBIN_API_KEY}});
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    notes = data.record.notes || [];
    renderNotes();
    setSyncStatus('synced');
  } catch(e) {
    console.error('Load error:',e);
    setSyncStatus('error');
  }
  hideLoader();
}

async function saveNotes(newNote) {
  if (!isConfigured()||isSaving) return;
  isSaving = true; setSyncStatus('saving');
  try {
    // Fetch latest from server first to avoid overwriting others' notes
    const getRes = await fetch('https://api.jsonbin.io/v3/b/'+JSONBIN_BIN_ID+'/latest',{headers:{'X-Access-Key':JSONBIN_API_KEY}});
    if (getRes.ok) {
      const data = await getRes.json();
      const serverNotes = data.record.notes || [];
      // ID-based merge: build a set of all known IDs, then combine without duplicates
      const idSet = new Set(serverNotes.map(n => n.id));
      if (newNote && !idSet.has(newNote.id)) {
        serverNotes.push(newNote);
      }
      notes = serverNotes;
      renderNotes();
    }
    // Now save the merged result
    const res = await fetch('https://api.jsonbin.io/v3/b/'+JSONBIN_BIN_ID,{
      method:'PUT',
      headers:{'Content-Type':'application/json','X-Access-Key':JSONBIN_API_KEY},
      body:JSON.stringify({notes})
    });
    if (!res.ok) throw new Error('HTTP '+res.status);
    setSyncStatus('synced');
  } catch(e) {
    console.error('Save error:',e);
    setSyncStatus('error');
  }
  isSaving = false;
}

async function refreshNotes() {
  if (!isConfigured()||isSaving) return;
  try {
    const res = await fetch('https://api.jsonbin.io/v3/b/'+JSONBIN_BIN_ID+'/latest',{headers:{'X-Access-Key':JSONBIN_API_KEY}});
    if (!res.ok) return;
    const data = await res.json();
    const fresh = data.record.notes||[];
    // Use ID-based comparison instead of just length — catches edits and reorders too
    const currentIds = new Set(notes.map(n => n.id));
    const freshIds = new Set(fresh.map(n => n.id));
    const hasChanges = fresh.length !== notes.length
      || fresh.some(n => !currentIds.has(n.id))
      || notes.some(n => !freshIds.has(n.id));
    if (hasChanges) { notes = fresh; renderNotes(); }
  } catch(e) {}
}

function setSyncStatus(s) {
  const dot = document.getElementById('syncDot'), txt = document.getElementById('syncText');
  dot.className = 'sync-dot';
  if (s==='synced'){ txt.textContent='Synced'; }
  else if (s==='saving'){ txt.textContent='Saving...'; dot.classList.add('saving'); }
  else { txt.textContent='Offline'; dot.classList.add('error'); }
}

function hideLoader() {
  const el = document.getElementById('loadingOverlay');
  el.classList.add('fade-out');
  setTimeout(()=>el.style.display='none',500);
}

// ─── Image Compression ───
function compressImage(dataUrl,maxW,quality){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas');
      let w=img.width,h=img.height;
      if(w>maxW){h=(maxW/w)*h;w=maxW;}
      c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg',quality));
    };
    img.src=dataUrl;
  });
}

// ─── Init ───
document.addEventListener('DOMContentLoaded',()=>{
  if (!isConfigured()) {
    console.warn(
      'JSONBin is not configured. Copy config.example.js to config.js and add your API keys. '
      + 'See README.md for setup instructions.'
    );
  }
  buildEmojiPicker(); buildDoodleTools(); initDoodleCanvas(); setupFormValidation();
  loadNotes();
  setInterval(refreshNotes,REFRESH_INTERVAL);
});

// ─── View ───
function setView(v){
  currentView=v;
  document.getElementById('boardBtn').classList.toggle('active',v==='board');
  document.getElementById('cardBtn').classList.toggle('active',v==='card');
  document.getElementById('boardView').classList.toggle('hidden',v!=='board');
  document.getElementById('cardView').classList.toggle('hidden',v!=='card');
  renderNotes();
}

// ─── Emoji ───
function buildEmojiPicker(){
  const p=document.getElementById('emojiPicker');
  EMOJIS.forEach(em=>{
    const b=document.createElement('button');b.className='emoji-btn';b.textContent=em;
    b.onclick=()=>{document.getElementById('messageInput').value+=em;toggleEmoji();validateForm();};
    p.appendChild(b);
  });
}
function toggleEmoji(){
  document.getElementById('emojiPicker').classList.toggle('hidden');
  document.getElementById('emojiToggle').classList.toggle('emoji-active');
}

// ─── Photo ───
async function handlePhoto(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=async ev=>{ currentPhoto=await compressImage(ev.target.result,300,0.6); renderAttachments(); };
  r.readAsDataURL(f);
}
function removePhoto(){ currentPhoto=null; document.getElementById('photoInput').value=''; renderAttachments(); }
function removeDoodle(){ currentDoodle=null; renderAttachments(); }
function renderAttachments(){
  const c=document.getElementById('attachments');
  c.innerHTML='';
  // Build attachment previews safely using DOM APIs instead of innerHTML
  if(currentDoodle) {
    const wrapper = document.createElement('div');
    wrapper.className = 'attachment-preview';
    const img = document.createElement('img');
    img.src = currentDoodle;
    img.alt = 'doodle';
    const btn = document.createElement('button');
    btn.className = 'remove-attachment';
    btn.textContent = '\u2715';
    btn.onclick = removeDoodle;
    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    c.appendChild(wrapper);
  }
  if(currentPhoto) {
    const wrapper = document.createElement('div');
    wrapper.className = 'attachment-preview';
    const img = document.createElement('img');
    img.src = currentPhoto;
    img.alt = 'photo';
    const btn = document.createElement('button');
    btn.className = 'remove-attachment';
    btn.textContent = '\u2715';
    btn.onclick = removePhoto;
    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    c.appendChild(wrapper);
  }
}

// ─── Doodle ───
function buildDoodleTools(){
  const ce=document.getElementById('doodleColors');
  DOODLE_COLORS.forEach(c=>{
    const b=document.createElement('button');b.className='color-dot'+(c===doodleColor?' active':'');b.style.background=c;
    b.onclick=()=>{doodleColor=c;ce.querySelectorAll('.color-dot').forEach(d=>d.classList.toggle('active',d.style.backgroundColor===c||d.style.background===c));};
    ce.appendChild(b);
  });
  const se=document.getElementById('doodleSizes');
  BRUSH_SIZES.forEach(s=>{
    const b=document.createElement('button');b.className='size-dot'+(s===doodleBrushSize?' active':'');
    const d=document.createElement('span');d.style.width=s*2.5+'px';d.style.height=s*2.5+'px';
    b.appendChild(d);
    b.onclick=()=>{doodleBrushSize=s;se.querySelectorAll('.size-dot').forEach(x=>x.classList.remove('active'));b.classList.add('active');};
    se.appendChild(b);
  });
}
function initDoodleCanvas(){
  const cv=document.getElementById('doodleCanvas');
  const gp=e=>{const r=cv.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX;const cy=e.touches?e.touches[0].clientY:e.clientY;return{x:(cx-r.left)*(cv.width/r.width),y:(cy-r.top)*(cv.height/r.height)};};
  const st=e=>{e.preventDefault();doodleDrawing=true;doodleLastPos=gp(e);};
  const dr=e=>{if(!doodleDrawing)return;e.preventDefault();const p=gp(e);const ctx=cv.getContext('2d');ctx.strokeStyle=doodleColor;ctx.lineWidth=doodleBrushSize;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(doodleLastPos.x,doodleLastPos.y);ctx.lineTo(p.x,p.y);ctx.stroke();doodleLastPos=p;};
  const en=()=>{doodleDrawing=false;};
  cv.addEventListener('mousedown',st);cv.addEventListener('mousemove',dr);cv.addEventListener('mouseup',en);cv.addEventListener('mouseleave',en);
  cv.addEventListener('touchstart',st,{passive:false});cv.addEventListener('touchmove',dr,{passive:false});cv.addEventListener('touchend',en);
}
function openDoodle(){document.getElementById('doodleOverlay').classList.remove('hidden');clearDoodle();}
function closeDoodle(){document.getElementById('doodleOverlay').classList.add('hidden');}
function clearDoodle(){document.getElementById('doodleCanvas').getContext('2d').clearRect(0,0,560,300);}
async function saveDoodle(){
  const cv=document.getElementById('doodleCanvas'),ctx=cv.getContext('2d');
  const px=ctx.getImageData(0,0,cv.width,cv.height).data;
  if(Array.from(px).some((v,i)=>i%4===3&&v>0)){
    currentDoodle=await compressImage(cv.toDataURL('image/png'),300,0.7);
    renderAttachments();
  }
  closeDoodle();
}

// ─── Form ───
function setupFormValidation(){
  document.getElementById('authorInput').addEventListener('input',validateForm);
  document.getElementById('messageInput').addEventListener('input',validateForm);
}
function validateForm(){
  const a=document.getElementById('authorInput').value.trim();
  const m=document.getElementById('messageInput').value.trim();
  document.getElementById('pinBtn').disabled=!a||!m;
}

async function pinNote(){
  const ae=document.getElementById('authorInput'),me=document.getElementById('messageInput');
  const a=ae.value.trim(),m=me.value.trim();
  if(!a||!m) return;
  const newNote = {id:Date.now(),author:a,message:m,doodle:currentDoodle,photo:currentPhoto,
    colorIdx:Math.floor(Math.random()*STICKY_COLORS.length),
    fontIdx:Math.floor(Math.random()*FONTS.length),
    rotation:(Math.random()-0.5)*6};
  // Optimistically add to local view
  notes.push(newNote);
  ae.value='';me.value='';currentDoodle=null;currentPhoto=null;
  document.getElementById('photoInput').value='';
  renderAttachments();validateForm();renderNotes();fireConfetti();
  // Save with merge to avoid overwriting others
  await saveNotes(newNote);
}

// ─── Render ───
function pinSVG(color){return `<svg class="pin" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="${escapeHtml(color)}"/><circle cx="8" cy="8" r="2.5" fill="rgba(255,255,255,0.4)"/></svg>`;}

function stickyHTML(n,d){
  const c=STICKY_COLORS[n.colorIdx%STICKY_COLORS.length],f=FONTS[n.fontIdx%FONTS.length],r=n.rotation||0;
  let media='';
  // Validate image sources to prevent XSS via crafted src attributes
  const safeDoodle = sanitizeImageSrc(n.doodle);
  const safePhoto = sanitizeImageSrc(n.photo);
  if(safeDoodle) media+=`<img src="${safeDoodle}" alt="doodle">`;
  if(safePhoto) media+=`<img class="photo" src="${safePhoto}" alt="photo">`;
  const safeMsg = escapeHtml(n.message);
  const safeAuthor = escapeHtml(n.author);
  // Sanitize rotation to a number to prevent style injection
  const safeRotation = Number(r) || 0;
  return `<div class="sticky-note" style="background:${c.bg};border-bottom:3px solid ${c.border};box-shadow:3px 4px 12px ${c.shadow},0 1px 3px rgba(0,0,0,0.08);transform:rotate(${safeRotation}deg);animation:float-in 0.5s ${d}s ease-out both;">
    ${pinSVG(c.border)}<div class="message" style="font-family:${f}">${safeMsg}</div>${media}
    <div class="author">\u2014 ${safeAuthor}</div></div>`;
}

function getPositions(cnt){
  const cols=Math.max(2,Math.min(4,Math.ceil(Math.sqrt(cnt)))),cw=240,gap=16,ch=Array(cols).fill(0);
  return Array.from({length:cnt},(_,i)=>{const col=i%cols;const x=col*(cw+gap);const y=ch[col];ch[col]+=180+((i*37+13)%40);return{left:x,top:y,zIndex:i+1};});
}

function renderNotes(){
  document.getElementById('noteCount').textContent=`${notes.length} note${notes.length!==1?'s':''} pinned`;
  const be=document.getElementById('boardView'),pos=getPositions(notes.length);
  const mt=pos.length?Math.max(...pos.map(p=>p.top))+250:600;
  be.style.minHeight=Math.max(600,mt)+'px';
  be.innerHTML=notes.map((n,i)=>{const p=pos[i];return `<div class="note-wrapper" style="left:${p.left}px;top:${p.top}px;z-index:${p.zIndex}">${stickyHTML(n,i*0.08)}</div>`;}).join('');
  document.getElementById('cardNotes').innerHTML=notes.map((n,i)=>`<div style="animation:float-in 0.4s ${i*0.1}s ease-out both">${stickyHTML(n,i*0.1)}</div>`).join('');
}

// ─── Confetti ───
function fireConfetti(){
  const c=document.getElementById('confetti');c.classList.remove('hidden');
  const cols=["#E53935","#FB8C00","#43A047","#1E88E5","#8E24AA","#F06292","#FFD600","#00BCD4"];
  let h='';
  for(let i=0;i<60;i++){const x=Math.random()*100,cl=cols[i%8],dl=Math.random()*0.5,du=1.5+Math.random()*1.5,sz=6+Math.random()*8,dr=(Math.random()-0.5)*80,ci=Math.random()>0.5;
    h+=`<div class="confetti-piece" style="left:${x}%;width:${sz}px;height:${ci?sz:sz*1.5}px;border-radius:${ci?'50%':'2px'};background:${cl};margin-left:${dr}px;animation:confetti-fall ${du}s ${dl}s ease-in forwards;"></div>`;}
  c.innerHTML=h;
  setTimeout(()=>{c.classList.add('hidden');c.innerHTML='';},3500);
}
