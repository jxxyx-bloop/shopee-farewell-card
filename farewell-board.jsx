import { useState, useRef, useCallback, useEffect } from "react";

const STICKY_COLORS = [
  { bg: "#FFF9C4", border: "#F9E547", shadow: "rgba(249,229,71,0.3)" },
  { bg: "#F8BBD0", border: "#EC407A", shadow: "rgba(236,64,122,0.3)" },
  { bg: "#C8E6C9", border: "#66BB6A", shadow: "rgba(102,187,106,0.3)" },
  { bg: "#BBDEFB", border: "#42A5F5", shadow: "rgba(66,165,245,0.3)" },
  { bg: "#FFE0B2", border: "#FFA726", shadow: "rgba(255,167,38,0.3)" },
  { bg: "#E1BEE7", border: "#AB47BC", shadow: "rgba(171,71,188,0.3)" },
  { bg: "#B2EBF2", border: "#26C6DA", shadow: "rgba(38,198,218,0.3)" },
  { bg: "#FFCCBC", border: "#FF7043", shadow: "rgba(255,112,67,0.3)" },
];

const EMOJI_PICKS = ["❤️","🎉","🥳","👏","🌟","💐","🫶","😢","🍀","🎊","✨","🙏","💪","🤗","🎈","🥂","💛","🦋","🌈","🫡"];

const FONTS = [
  "'Caveat', cursive",
  "'Patrick Hand', cursive",
  "'Shadows Into Light', cursive",
  "'Indie Flower', cursive",
];

const PIN = ({ color = "#E53935" }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", zIndex: 3, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>
    <circle cx="10" cy="10" r="7" fill={color} />
    <circle cx="8" cy="8" r="2.5" fill="rgba(255,255,255,0.4)" />
  </svg>
);

// Mini doodle canvas component
function DoodleCanvas({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#333333");
  const [size, setSize] = useState(3);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "transparent";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvasRef.current.width / rect.width), y: (clientY - rect.top) * (canvasRef.current.height / rect.height) };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const doodleColors = ["#333333", "#E53935", "#1E88E5", "#43A047", "#FB8C00", "#8E24AA", "#00ACC1", "#F06292"];

  return (
    <div style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700 }}>🎨 Draw something!</span>
        <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>
      <canvas
        ref={canvasRef}
        width={560}
        height={300}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        style={{ width: "100%", height: 200, border: "2px dashed #ccc", borderRadius: 8, cursor: "crosshair", touchAction: "none", background: "repeating-conic-gradient(#f5f5f5 0% 25%, transparent 0% 50%) 50% / 16px 16px" }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        {doodleColors.map(c => (
          <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: color === c ? "3px solid #333" : "2px solid #ddd", cursor: "pointer", padding: 0 }} />
        ))}
        <span style={{ margin: "0 6px", color: "#999" }}>|</span>
        {[2, 4, 7].map(s => (
          <button key={s} onClick={() => setSize(s)} style={{ width: 28, height: 28, borderRadius: "50%", background: size === s ? "#eee" : "transparent", border: size === s ? "2px solid #999" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <span style={{ width: s * 2.5, height: s * 2.5, borderRadius: "50%", background: "#333", display: "block" }} />
          </button>
        ))}
        <button onClick={clearCanvas} style={{ marginLeft: "auto", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "'Patrick Hand', cursive", fontSize: 14 }}>Clear</button>
      </div>
      <button
        onClick={() => {
          const dataUrl = canvasRef.current.toDataURL("image/png");
          // check if canvas is blank
          const ctx = canvasRef.current.getContext("2d");
          const pixels = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data;
          const hasContent = pixels.some((v, i) => i % 4 === 3 && v > 0);
          if (hasContent) onSave(dataUrl);
        }}
        style={{ marginTop: 12, width: "100%", padding: "10px 0", background: "#4CAF50", color: "white", border: "none", borderRadius: 8, fontFamily: "'Caveat', cursive", fontSize: 20, cursor: "pointer", fontWeight: 700, letterSpacing: 0.5 }}
      >
        Add to my note ✓
      </button>
    </div>
  );
}

// Sticky note component
function StickyNote({ note, style: posStyle }) {
  const colorScheme = STICKY_COLORS[note.colorIdx % STICKY_COLORS.length];
  const font = FONTS[note.fontIdx % FONTS.length];
  const rotation = note.rotation || 0;

  return (
    <div style={{
      ...posStyle,
      background: colorScheme.bg,
      borderRadius: 4,
      padding: "28px 18px 18px",
      width: 220,
      minHeight: 140,
      position: "relative",
      transform: `rotate(${rotation}deg)`,
      boxShadow: `3px 4px 12px ${colorScheme.shadow}, 0 1px 3px rgba(0,0,0,0.08)`,
      transition: "transform 0.25s ease, box-shadow 0.25s ease",
      cursor: "default",
      borderBottom: `3px solid ${colorScheme.border}`,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = `rotate(0deg) scale(1.04)`; e.currentTarget.style.zIndex = 50; }}
      onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${rotation}deg) scale(1)`; e.currentTarget.style.zIndex = posStyle.zIndex || 1; }}
    >
      <PIN color={colorScheme.border} />
      <div style={{ fontFamily: font, fontSize: 15, lineHeight: 1.5, color: "#333", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
        {note.message}
      </div>
      {note.doodle && (
        <img src={note.doodle} alt="doodle" style={{ width: "100%", marginTop: 8, borderRadius: 6, border: "1px solid rgba(0,0,0,0.06)" }} />
      )}
      {note.photo && (
        <img src={note.photo} alt="photo" style={{ width: "100%", marginTop: 8, borderRadius: 6, objectFit: "cover", maxHeight: 150, border: "1px solid rgba(0,0,0,0.06)" }} />
      )}
      <div style={{ marginTop: 12, fontFamily: "'Patrick Hand', cursive", fontSize: 13, color: "#888", textAlign: "right", fontStyle: "italic" }}>
        — {note.author}
      </div>
    </div>
  );
}

// Compose form
function ComposeForm({ onPost }) {
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [showDoodle, setShowDoodle] = useState(false);
  const [doodle, setDoodle] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!author.trim() || !message.trim()) return;
    onPost({
      author: author.trim(),
      message: message.trim(),
      doodle,
      photo,
      colorIdx: Math.floor(Math.random() * STICKY_COLORS.length),
      fontIdx: Math.floor(Math.random() * FONTS.length),
      rotation: (Math.random() - 0.5) * 6,
      id: Date.now(),
    });
    setAuthor("");
    setMessage("");
    setDoodle(null);
    setPhoto(null);
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.6)", maxWidth: 440, width: "100%" }}>
      <h3 style={{ fontFamily: "'Caveat', cursive", fontSize: 26, margin: "0 0 16px", color: "#444" }}>✍️ Leave a note for Eveline</h3>
      <input
        type="text"
        placeholder="Your name"
        value={author}
        onChange={e => setAuthor(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", border: "2px solid #e0e0e0", borderRadius: 8, fontFamily: "'Patrick Hand', cursive", fontSize: 16, marginBottom: 10, boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
        onFocus={e => e.target.style.borderColor = "#90CAF9"}
        onBlur={e => e.target.style.borderColor = "#e0e0e0"}
      />
      <div style={{ position: "relative" }}>
        <textarea
          placeholder="Write your farewell message... 💛"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: "10px 14px", border: "2px solid #e0e0e0", borderRadius: 8, fontFamily: "'Patrick Hand', cursive", fontSize: 16, resize: "vertical", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = "#90CAF9"}
          onBlur={e => e.target.style.borderColor = "#e0e0e0"}
        />
      </div>

      {/* Attachments preview */}
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {doodle && (
          <div style={{ position: "relative", display: "inline-block" }}>
            <img src={doodle} alt="doodle" style={{ height: 60, borderRadius: 6, border: "1px solid #ddd" }} />
            <button onClick={() => setDoodle(null)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#E53935", color: "white", border: "none", cursor: "pointer", fontSize: 12, lineHeight: "20px", padding: 0 }}>✕</button>
          </div>
        )}
        {photo && (
          <div style={{ position: "relative", display: "inline-block" }}>
            <img src={photo} alt="photo" style={{ height: 60, borderRadius: 6, border: "1px solid #ddd", objectFit: "cover" }} />
            <button onClick={() => setPhoto(null)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#E53935", color: "white", border: "none", cursor: "pointer", fontSize: 12, lineHeight: "20px", padding: 0 }}>✕</button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => setShowEmoji(!showEmoji)} style={{ padding: "8px 14px", background: showEmoji ? "#FFF9C4" : "#f5f5f5", border: showEmoji ? "2px solid #F9E547" : "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 16, transition: "all 0.2s" }} title="Add emoji">😊</button>
        <button onClick={() => setShowDoodle(true)} style={{ padding: "8px 14px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontFamily: "'Patrick Hand', cursive", fontSize: 14, transition: "all 0.2s" }} title="Draw a doodle">🎨 Doodle</button>
        <button onClick={() => fileRef.current?.click()} style={{ padding: "8px 14px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontFamily: "'Patrick Hand', cursive", fontSize: 14, transition: "all 0.2s" }} title="Add photo">📷 Photo</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
        <button
          onClick={handleSubmit}
          disabled={!author.trim() || !message.trim()}
          style={{
            marginLeft: "auto",
            padding: "10px 24px",
            background: (!author.trim() || !message.trim()) ? "#ccc" : "linear-gradient(135deg, #66BB6A, #43A047)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontFamily: "'Caveat', cursive",
            fontSize: 20,
            fontWeight: 700,
            cursor: (!author.trim() || !message.trim()) ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            boxShadow: (!author.trim() || !message.trim()) ? "none" : "0 2px 8px rgba(67,160,71,0.3)",
          }}
        >
          Pin it! 📌
        </button>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, padding: 10, background: "#FFFDE7", borderRadius: 10, border: "1px solid #F9E547" }}>
          {EMOJI_PICKS.map(em => (
            <button key={em} onClick={() => { setMessage(m => m + em); setShowEmoji(false); }} style={{ width: 36, height: 36, background: "none", border: "none", fontSize: 22, cursor: "pointer", borderRadius: 6, transition: "background 0.15s" }} onMouseEnter={e => e.target.style.background = "rgba(0,0,0,0.05)"} onMouseLeave={e => e.target.style.background = "none"}>{em}</button>
          ))}
        </div>
      )}

      {/* Doodle modal */}
      {showDoodle && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ maxWidth: 500, width: "100%" }}>
            <DoodleCanvas onSave={(d) => { setDoodle(d); setShowDoodle(false); }} onCancel={() => setShowDoodle(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// Confetti burst
function Confetti() {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    const colors = ["#E53935","#FB8C00","#43A047","#1E88E5","#8E24AA","#F06292","#FFD600","#00BCD4"];
    const p = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
      size: 6 + Math.random() * 8,
      drift: (Math.random() - 0.5) * 80,
      shape: Math.random() > 0.5 ? "circle" : "rect",
    }));
    setParticles(p);
  }, []);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      <style>{`
        @keyframes confetti-fall { 
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: -20,
          width: p.size,
          height: p.shape === "rect" ? p.size * 1.5 : p.size,
          borderRadius: p.shape === "circle" ? "50%" : 2,
          background: p.color,
          animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          marginLeft: p.drift,
        }} />
      ))}
    </div>
  );
}

// Main board
export default function FarewellBoard() {
  const [notes, setNotes] = useState([
    { id: 1, author: "The Team", message: "We'll miss you so much, Eveline! 💛\nYou made every day brighter.", colorIdx: 0, fontIdx: 0, rotation: -2, doodle: null, photo: null },
  ]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [viewMode, setViewMode] = useState("board"); // board or card

  const addNote = (note) => {
    setNotes(prev => [...prev, note]);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Masonry-ish layout positions
  const getPositions = useCallback((count) => {
    const cols = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(count))));
    const colWidth = 240;
    const gap = 16;
    const colHeights = Array(cols).fill(0);
    return Array.from({ length: count }, (_, i) => {
      const col = i % cols;
      const x = col * (colWidth + gap);
      const y = colHeights[col];
      colHeights[col] += 180 + Math.random() * 40;
      return { left: x, top: y, zIndex: i + 1 };
    });
  }, []);

  const positions = getPositions(notes.length);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg, #5D4037 0%, #4E342E 40%, #3E2723 100%)", fontFamily: "'Patrick Hand', cursive", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Indie+Flower&family=Patrick+Hand&family=Shadows+Into+Light&display=swap');
        @keyframes float-in { from { opacity: 0; transform: translateY(30px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes subtle-sway { 0%,100% { transform: rotate(-0.5deg); } 50% { transform: rotate(0.5deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {showConfetti && <Confetti />}

      {/* Cork texture overlay */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", pointerEvents: "none", opacity: 0.4 }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 10, padding: "32px 24px 20px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: "clamp(36px, 6vw, 56px)", color: "#FFF9C4", margin: 0, textShadow: "2px 3px 6px rgba(0,0,0,0.4)", letterSpacing: 1 }}>
          🌸 Farewell, Eveline! 🌸
        </h1>
        <p style={{ fontFamily: "'Shadows Into Light', cursive", color: "rgba(255,249,196,0.7)", fontSize: "clamp(16px, 2.5vw, 22px)", marginTop: 6, letterSpacing: 2 }}>
          A board full of love from your amazing team
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <button onClick={() => setViewMode("board")} style={{ padding: "6px 18px", background: viewMode === "board" ? "rgba(255,249,196,0.25)" : "transparent", color: "#FFF9C4", border: "1px solid rgba(255,249,196,0.3)", borderRadius: 20, fontFamily: "'Patrick Hand', cursive", fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}>📋 Board</button>
          <button onClick={() => setViewMode("card")} style={{ padding: "6px 18px", background: viewMode === "card" ? "rgba(255,249,196,0.25)" : "transparent", color: "#FFF9C4", border: "1px solid rgba(255,249,196,0.3)", borderRadius: 20, fontFamily: "'Patrick Hand', cursive", fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}>💌 Card View</button>
        </div>
        <div style={{ marginTop: 10, color: "rgba(255,249,196,0.5)", fontSize: 14 }}>
          {notes.length} note{notes.length !== 1 ? "s" : ""} pinned
        </div>
      </div>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 5, maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px", display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>

        {/* Compose form */}
        <div style={{ position: "sticky", top: 20, zIndex: 20, animation: "float-in 0.6s ease-out" }}>
          <ComposeForm onPost={addNote} />
        </div>

        {/* Notes display */}
        {viewMode === "board" ? (
          <div style={{ position: "relative", flex: "1 1 500px", minHeight: Math.max(600, (positions[positions.length - 1]?.top || 0) + 250) }}>
            {notes.map((note, i) => (
              <div key={note.id} style={{ position: "absolute", ...positions[i], animation: `float-in 0.5s ${i * 0.08}s ease-out both` }}>
                <StickyNote note={note} style={{}} />
              </div>
            ))}
          </div>
        ) : (
          /* Card view - stacked like pages of a card */
          <div style={{ flex: "1 1 500px", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: 32, maxWidth: 600, width: "100%", border: "2px solid rgba(255,249,196,0.15)", backdropFilter: "blur(4px)" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <span style={{ fontSize: 48 }}>💌</span>
                <h2 style={{ fontFamily: "'Caveat', cursive", color: "#FFF9C4", fontSize: 32, margin: "8px 0 0" }}>Messages for Eveline</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {notes.map((note, i) => (
                  <div key={note.id} style={{ animation: `float-in 0.4s ${i * 0.1}s ease-out both` }}>
                    <StickyNote note={note} style={{}} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "20px 0 32px", position: "relative", zIndex: 5 }}>
        <p style={{ fontFamily: "'Shadows Into Light', cursive", color: "rgba(255,249,196,0.4)", fontSize: 14 }}>
          Made with love 💛 • Pin your note above!
        </p>
      </div>
    </div>
  );
}
