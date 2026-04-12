// ─── Constants ───
const REFRESH_INTERVAL = 15000; // auto-refresh every 15 seconds

const STICKY_COLORS = [
  {bg:"#FFF9C4",border:"#F9E547",shadow:"rgba(249,229,71,0.3)"},
  {bg:"#F8BBD0",border:"#EC407A",shadow:"rgba(236,64,122,0.3)"},
  {bg:"#C8E6C9",border:"#66BB6A",shadow:"rgba(102,187,106,0.3)"},
  {bg:"#BBDEFB",border:"#42A5F5",shadow:"rgba(66,165,245,0.3)"},
  {bg:"#FFE0D3",border:"#EE4D2D",shadow:"rgba(238,77,45,0.25)"},
  {bg:"#E1BEE7",border:"#AB47BC",shadow:"rgba(171,71,188,0.3)"},
  {bg:"#FFF3E0",border:"#FF7337",shadow:"rgba(255,115,55,0.25)"},
  {bg:"#FFCCBC",border:"#FF7043",shadow:"rgba(255,112,67,0.3)"},
];
const EMOJIS = ["❤️","🎉","🥳","👏","🌟","💐","🫶","😢","🍀","🎊","✨","🙏","💪","🤗","🎈","🥂","💛","🦋","🌈","🫡"];
const FONTS = ["'Caveat',cursive","'Patrick Hand',cursive","'Shadows Into Light',cursive","'Indie Flower',cursive"];
let notes = [];
let currentView = 'board';
let isSaving = false;

// Track which note IDs belong to this browser session (persists across refreshes)
let myNoteIds = new Set(JSON.parse(localStorage.getItem('myNoteIds') || '[]'));
let editingNoteId = null;

// ─── Sanitization Helpers ───

/** Escape HTML special characters to prevent XSS */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ─── JSONBin Storage ───
function isConfigured() {
  return typeof JSONBIN_BIN_ID !== 'undefined' && JSONBIN_BIN_ID
      && typeof JSONBIN_API_KEY !== 'undefined' && JSONBIN_API_KEY;
}

async function loadNotes() {
  if (!isConfigured()) {
    hideLoader();
    notes = [{id:1,author:"The Team",message:"We'll miss you so much, {{RECIPIENT_NAME}}! \u{1F49B}\nYou made every day brighter.",colorIdx:0,fontIdx:0,rotation:-2,doodle:null}];
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

// Generic sync helper: fetches latest, applies transform, PUTs result back.
// transform receives the server notes array and must return the new notes array.
async function syncNotes(transform) {
  if (!isConfigured() || isSaving) return;
  isSaving = true; setSyncStatus('saving');
  try {
    const getRes = await fetch('https://api.jsonbin.io/v3/b/'+JSONBIN_BIN_ID+'/latest',{headers:{'X-Access-Key':JSONBIN_API_KEY}});
    if (!getRes.ok) throw new Error('HTTP '+getRes.status);
    const data = await getRes.json();
    const updated = transform(data.record.notes || []);
    const putRes = await fetch('https://api.jsonbin.io/v3/b/'+JSONBIN_BIN_ID,{
      method:'PUT',
      headers:{'Content-Type':'application/json','X-Access-Key':JSONBIN_API_KEY},
      body:JSON.stringify({notes:updated})
    });
    if (!putRes.ok) throw new Error('HTTP '+putRes.status);
    notes = updated;
    renderNotes();
    setSyncStatus('synced');
  } catch(e) {
    console.error('Sync error:',e);
    setSyncStatus('error');
  }
  isSaving = false;
}

async function saveNotes(newNote) {
  await syncNotes(serverNotes => {
    const idSet = new Set(serverNotes.map(n => n.id));
    if (newNote && !idSet.has(newNote.id)) serverNotes.push(newNote);
    return serverNotes;
  });
}

async function deleteNote(id) {
  if (isSaving) { alert('Still saving — please try again in a moment.'); return; }
  if (!confirm('Delete your note? This cannot be undone.')) return;
  // Optimistic local removal
  notes = notes.filter(n => n.id !== id);
  myNoteIds.delete(id);
  localStorage.setItem('myNoteIds', JSON.stringify([...myNoteIds]));
  renderNotes();
  await syncNotes(serverNotes => serverNotes.filter(n => n.id !== id));
}

function openEdit(id) {
  if (isSaving) { alert('Still saving — please try again in a moment.'); return; }
  const note = notes.find(n => n.id === id);
  if (!note) return;
  editingNoteId = id;
  document.getElementById('editInput').value = note.message;
  document.getElementById('saveEditBtn').disabled = false;
  document.getElementById('editOverlay').classList.remove('hidden');
}

function closeEdit() {
  editingNoteId = null;
  document.getElementById('editOverlay').classList.add('hidden');
}

function validateEditForm() {
  document.getElementById('saveEditBtn').disabled =
    !document.getElementById('editInput').value.trim();
}

async function saveEdit() {
  const newMsg = document.getElementById('editInput').value.trim();
  if (!newMsg || !editingNoteId) return;
  const id = editingNoteId;
  // Optimistic local update
  const note = notes.find(n => n.id === id);
  if (note) note.message = newMsg;
  renderNotes();
  closeEdit();
  await syncNotes(serverNotes =>
    serverNotes.map(n => n.id === id ? {...n, message: newMsg} : n)
  );
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
      || notes.some(n => !freshIds.has(n.id))
      || fresh.some(n => { const l = notes.find(x => x.id === n.id); return l && l.message !== n.message; });
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

// ─── Init ───
document.addEventListener('DOMContentLoaded',()=>{
  if (!isConfigured()) {
    console.warn(
      'JSONBin is not configured. Copy config.example.js to config.js and add your API keys. '
      + 'See README.md for setup instructions.'
    );
  }
  buildEmojiPicker(); setupFormValidation();
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
  const newNote = {id:Date.now(),author:a,message:m,
    colorIdx:Math.floor(Math.random()*STICKY_COLORS.length),
    fontIdx:Math.floor(Math.random()*FONTS.length),
    rotation:(Math.random()-0.5)*6};
  // Remember this note belongs to us so we can edit/delete it later
  myNoteIds.add(newNote.id);
  localStorage.setItem('myNoteIds', JSON.stringify([...myNoteIds]));
  // Optimistically add to local view
  notes.push(newNote);
  ae.value='';me.value='';
  validateForm();renderNotes();fireConfetti();showMascotCelebration();
  // Save with merge to avoid overwriting others
  await saveNotes(newNote);
}

// ─── Render ───
function pinSVG(color){return `<svg class="pin" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="${escapeHtml(color)}"/><circle cx="8" cy="8" r="2.5" fill="rgba(255,255,255,0.4)"/></svg>`;}

function stickyHTML(n,d){
  const c=STICKY_COLORS[n.colorIdx%STICKY_COLORS.length],f=FONTS[n.fontIdx%FONTS.length],r=n.rotation||0;
  const safeMsg = escapeHtml(n.message);
  const safeAuthor = escapeHtml(n.author);
  // Sanitize rotation and id to numbers to prevent style/attribute injection
  const safeRotation = Number(r) || 0;
  const safeId = Number(n.id);
  // Show edit/delete controls only for notes pinned in this browser session
  const actions = myNoteIds.has(n.id)
    ? `<div class="note-actions">
        <button class="note-action-btn edit-btn" onclick="openEdit(${safeId})" title="Edit your note">✏️</button>
        <button class="note-action-btn delete-btn" onclick="deleteNote(${safeId})" title="Delete your note">🗑️</button>
       </div>`
    : '';
  return `<div class="sticky-note" style="background:${c.bg};border-bottom:3px solid ${c.border};box-shadow:3px 4px 12px ${c.shadow},0 1px 3px rgba(0,0,0,0.08);transform:rotate(${safeRotation}deg);animation:float-in 0.5s ${d}s ease-out both;">
    ${pinSVG(c.border)}<div class="message" style="font-family:${f}">${safeMsg}</div>
    <div class="author">\u2014 ${safeAuthor}</div>${actions}</div>`;
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

// ─── Admin ───
// Run this in the browser console to wipe the entire board (you only, as creator).
// Example: resetBoard()
window.resetBoard = async function() {
  if (!confirm('ADMIN: Permanently delete ALL notes from the board?')) return;
  if (!confirm('Are you absolutely sure? There is no undo.')) return;
  if (!isConfigured()) { console.error('JSONBin not configured.'); return; }
  await syncNotes(() => []);
  myNoteIds = new Set();
  localStorage.removeItem('myNoteIds');
  console.log('%c Board cleared successfully. ', 'background:#43A047;color:white;font-size:14px;padding:4px 8px;border-radius:4px;');
};

// ─── Confetti ───
function fireConfetti(){
  const c=document.getElementById('confetti');c.classList.remove('hidden');
  const cols=["#EE4D2D","#FF7337","#FB8C00","#43A047","#1E88E5","#8E24AA","#F06292","#FFD600"];
  let h='';
  for(let i=0;i<60;i++){const x=Math.random()*100,cl=cols[i%8],dl=Math.random()*0.5,du=1.5+Math.random()*1.5,sz=6+Math.random()*8,dr=(Math.random()-0.5)*80,ci=Math.random()>0.5;
    h+=`<div class="confetti-piece" style="left:${x}%;width:${sz}px;height:${ci?sz:sz*1.5}px;border-radius:${ci?'50%':'2px'};background:${cl};margin-left:${dr}px;animation:confetti-fall ${du}s ${dl}s ease-in forwards;"></div>`;}
  c.innerHTML=h;
  setTimeout(()=>{c.classList.add('hidden');c.innerHTML='';},3500);
}

// ─── Mascot Celebration ───
function showMascotCelebration(){
  const el=document.getElementById('mascotCelebrate');
  if(!el) return;
  el.classList.remove('hidden','fade-out');
  clearTimeout(el._timer);
  el._timer=setTimeout(()=>{
    el.classList.add('fade-out');
    setTimeout(()=>el.classList.add('hidden'),500);
  },2000);
}
