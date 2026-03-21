# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static flipbook web app — a 3D page-flip book reader powered by **StPageFlip** (cdn.jsdelivr.net/npm/page-flip). No build tools, no framework. Single HTML page with vanilla JS and CSS.

## Commands

- **Run locally**: Serve via any static server (e.g., VS Code Live Server, `npx serve`) to avoid CORS issues with audio files. Opening `index.html` directly may block audio.
- **No build step** — edit and refresh.

## Architecture

### File responsibilities
- **`index.html`** — Book structure. All `.page` divs are pages; the first one acts as the cover (via StPageFlip's `showCover: true`). Pages link to images via inline `style="background-image: url(...)"` and optionally to audio via `data-audio="assets/audio/..."` attributes.
- **`css/style.css`** — All styling: book shadow, page textures, glassmorphism audio player, particle/star background, responsive breakpoints.
- **`js/app.js`** — StPageFlip initialization, audio controller (single shared `<audio>` element), touch/click gesture handling for page navigation, background ambient audio loop, welcome screen unlock.

### Key StPageFlip options (set in `initFlipBook()`)
| Option | Value | Note |
|---|---|---|
| `showCover` | `true` | First page renders as cover |
| `size` | `"stretch"` | Book fills parent |
| `flippingTime` | `400` | ms |
| `usePortrait` | `true` | Forces single-page portrait mode |

### Audio system
- **Single shared `<audio>` element** (`audioController.player`) prevents iOS audio stacking.
- `data-audio` on `.page` maps page index → audio URL. Audio is scanned at `init()`, stored in `audioController.tracks`.
- Background music: separate `backgroundAudio` instance, loops, lower volume.
- iOS unlock: plays a silent base64 WAV on first user interaction (`unlockAudioForMobile`).

### State flags
- `isUserActive` — set after welcome screen click; gates audio playback.
- `audioOnPageFlipEnabled` — currently `false`; set `true` to re-enable narration on page turn.

### Event flow for page turn
1. User click/touch → `flipPrev()` / `flipNext()` on `pageFlipLib`
2. StPageFlip animates the page
3. `flip` event fires → `audioController.playSpread([...pageIndices])` queues audio for visible pages
4. Audio plays; on `ended`, auto-flips to next spread after 800ms delay

## Adding / Removing Pages

1. Edit `index.html` — add or remove `.page` divs inside `#flip-book`.
2. Name images consistently in `assets/images/` and audio in `assets/audio/`.
3. Update `data-audio` attribute to point to the correct audio file.

## Responsive Behavior

- **≤ 800px**: Mobile layout. Book constrained to `max-width: 320px`, portrait aspect ratio.
- **> 800px**: Desktop layout. Book stretches to container.

## Known quirks

- Page 25 (`page-25.webp`) has an empty `data-audio` value — audio path is `assets/audio/` with no filename.
- The commented-out hardcovers (`.page-cover-top`, `.page-cover-bottom`) are intentionally disabled; removing comments adds physical cover pages.
