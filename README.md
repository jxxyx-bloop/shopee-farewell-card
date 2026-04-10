# Farewell Card

A reusable, white-label collaborative farewell card where the whole team can pin sticky-note messages and doodles on a shared board. Notes persist across page refreshes and are visible to everyone in real time.

## Live Demo

<https://shopee-farewell-card.vercel.app/>

## Personalizing for a New Recipient

The card uses the placeholder `{{RECIPIENT_NAME}}` in several places. To customize it for a specific person, find-and-replace the placeholder with their name in these files:

| File | Locations |
|------|-----------|
| `index.html` | `<title>`, `<h1>` heading, compose form `<h3>`, card-view `<h2>` |
| `app.js` | Demo message shown when JSONBin is not configured |

For example, to make a card for **Alice**:

```bash
sed -i 's/{{RECIPIENT_NAME}}/Alice/g' index.html app.js
```

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

## Features

- Pin sticky notes with messages, author name, and doodles
- Random pastel colors and handwriting fonts for each note
- Two views: Board (scattered layout) and Card (vertical list)
- Real-time multi-user sync via JSONBin (every 15 seconds)
- Edit and delete your own notes
- Doodle canvas with color and brush-size picker
- Emoji picker
- Confetti animation on pin
- Sync status indicator
- Responsive layout (mobile-friendly)

## Architecture

```
index.html           HTML structure only — no inline CSS or JS
style.css            All styles (layout, animations, responsive breakpoints)
app.js               Application logic (storage, rendering, UI interactions)
config.js            API keys (git-ignored, auto-generated on Vercel)
config.example.js    Template for config.js (committed, no real keys)
build.js             Build script — generates config.js from env vars
package.json         Defines the build script for Vercel
vercel.json          Vercel build & output configuration
.gitignore           Excludes config.js from version control
```

This is a **static** client-side application that talks directly to the [JSONBin.io](https://jsonbin.io) REST API for storage. The only build step is a small script that generates `config.js` from environment variables at deploy time.

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
- **`Date.now()` IDs:** Two notes created within the same millisecond on different machines would collide. In practice this is extremely unlikely for a farewell card with human-speed input.

## Security

| Concern | Mitigation |
|---------|------------|
| **API keys in source** | Moved to git-ignored `config.js`; template committed as `config.example.js` |
| **XSS via message/author** | All user text is escaped with `escapeHtml()` (DOM-based, not regex) before rendering |
| **XSS via image src** | Doodle `src` attributes are validated against a strict `data:image/*;base64,...` regex; anything else is stripped |
| **Style injection** | Rotation values are cast to `Number()` before interpolation into style attributes |
| **innerHTML in attachments** | Replaced with DOM API (`createElement`/`appendChild`) to avoid injection in the compose panel |
| **Client-side key exposure** | Documented as an inherent trade-off of a serverless static app (see note above) |

## Deployment

### Vercel (recommended)

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. In your Vercel project, go to **Settings > Environment Variables** and add:
   - `JSONBIN_BIN_ID` — your JSONBin bin ID
   - `JSONBIN_API_KEY` — your JSONBin X-Access-Key
4. Deploy (or redeploy). Vercel runs `build.js`, which generates `config.js` from the env vars.

> `config.js` is git-ignored so it never appears in your repo. Vercel generates it fresh on every build from the environment variables you set in the dashboard.

### Other hosts (GitHub Pages, Netlify, any static server)

You need `config.js` to be present on the server. Either:
- Upload it manually alongside the other files, or
- Set up a similar build step that generates it from environment variables.

## File Details

| File | Purpose |
|------|---------|
| `index.html` | HTML structure, links to CSS/JS |
| `style.css` | All styles including responsive layout |
| `app.js` | All application logic |
| `config.js` | API keys (git-ignored, auto-generated on Vercel) |
| `config.example.js` | API key template (committed) |
| `build.js` | Generates config.js from environment variables |
| `package.json` | Build script definition for Vercel |
| `vercel.json` | Vercel build command and output directory |
