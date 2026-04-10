# Farewell Card for Eveline

A collaborative farewell card where the whole team can pin sticky-note messages, doodles, and photos on a shared board. Notes persist across page refreshes and are visible to everyone in real time.

## Quick Start

1. **Get a free JSONBin account** at [jsonbin.io](https://jsonbin.io)
2. Create a new bin with this content: `{"notes":[]}`
3. Copy `config.example.js` to `config.js`:
   ```
   cp config.example.js config.js
   ```
4. Paste your **Bin ID** and **API Key** into `config.js`
5. Open `index.html` in a browser (or deploy to any static host)

> **Important:** `config.js` is git-ignored to keep your API keys out of version control. Never commit it. The repository includes `config.example.js` as a template.

## Architecture

```
index.html           HTML structure only — no inline CSS or JS
style.css            All styles (layout, animations, responsive breakpoints)
app.js               Application logic (storage, rendering, UI interactions)
config.js            API keys (git-ignored, not committed)
config.example.js    Template for config.js (committed, no real keys)
.gitignore           Excludes config.js from version control
```

This is a **purely static** client-side application — no server, no build step. It talks directly to the [JSONBin.io](https://jsonbin.io) REST API for storage.

### Why a separate `config.js`?

The original code had API keys hardcoded in `index.html`, which meant they were committed to git history and visible in the page source. Separating them into a git-ignored file means:

- Keys are **not in version control** — new contributors copy the example and add their own.
- If you rotate your JSONBin API key, you only edit one file.

> **Note on client-side keys:** Because this is a static site with no backend, the API key is still visible to anyone who opens browser DevTools on the deployed page. This is an inherent limitation of client-only apps. For this use case (a team farewell card with a short lifespan), the risk is acceptable. If stronger protection is needed, you would need a backend proxy that holds the key server-side.

## How Multi-User Concurrency Works

Multiple people can write farewell messages at the same time. Here is how the app handles that:

### Write Path (saving a new note)

1. User clicks "Pin it!" — the note is **optimistically added** to the local view immediately (instant feedback).
2. Before writing to JSONBin, the app **fetches the latest server state**.
3. It performs an **ID-based merge**: builds a set of all note IDs from the server, then appends the new note only if its ID is not already present. This prevents duplicates.
4. The merged array is PUT back to JSONBin.

### Read Path (auto-refresh)

- Every **15 seconds**, the app fetches the latest notes from JSONBin.
- It compares by **note IDs** (not just array length), so it detects new notes, removed notes, or reordered notes.
- If any difference is found, the local state is replaced and the view is re-rendered.

### Known Limitations

- **Last-write-wins race window:** JSONBin does not support atomic read-modify-write. If two users save within the same ~200ms network round-trip, the second PUT may overwrite the first user's note. The ID-based merge minimizes this (it correctly merges whenever the fetches don't overlap), but it cannot eliminate it entirely without server-side locking.
- **Append-only:** Notes cannot be edited or deleted through the UI, which simplifies the concurrency model — there are no update conflicts, only potential insert-vs-insert races.
- **`Date.now()` IDs:** Two notes created within the same millisecond on different machines would collide. In practice this is extremely unlikely for a farewell card with human-speed input.

## Security

| Concern | Mitigation |
|---------|-----------|
| **API keys in source** | Moved to git-ignored `config.js`; template committed as `config.example.js` |
| **XSS via message/author** | All user text is escaped with `escapeHtml()` (DOM-based, not regex) before rendering |
| **XSS via image src** | Doodle/photo `src` attributes are validated against a strict `data:image/*;base64,...` regex; anything else is stripped |
| **Style injection** | Rotation values are cast to `Number()` before interpolation into style attributes |
| **innerHTML in attachments** | Replaced with DOM API (`createElement`/`appendChild`) to avoid injection in the compose panel |
| **Client-side key exposure** | Documented as an inherent trade-off of a serverless static app (see note above) |

## Deployment

This is a static site — deploy it anywhere:

- **GitHub Pages:** push to a branch, enable Pages in repo settings
- **Netlify / Vercel:** drag and drop the folder
- **Any web server:** just serve the files

Make sure `config.js` is present on the deployed server (upload it manually or set it via a deploy script — just don't commit it to git).

## File Details

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~80 | HTML structure, links to CSS/JS |
| `style.css` | ~170 | All styles including responsive layout |
| `app.js` | ~250 | All application logic |
| `config.js` | ~10 | API keys (git-ignored) |
| `config.example.js` | ~10 | API key template (committed) |
