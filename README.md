# R5Reloaded Launcher

Built with Tauri, React, and TypeScript.

## Stack

- Frontend: React + Vite + TypeScript
- Desktop shell: Tauri 2
- Backend commands: Rust

## Project Layout

- `src/` - launcher UI, views, hooks, and frontend logic
- `src-tauri/` - native app code, commands, updater, install logic
- `public/` - static assets such as UI art, audio, fonts, and videos
- `scripts/` - small build helpers

## Development

Install dependencies:

```bash
npm install
```

Run the launcher:

```bash
npm run tauri dev
```

## Build

Build the launcher:

```bash
npm run tauri build
```

This project is set up to output build artifacts into the top-level `build/` directory.

The custom Tauri script also writes:

- the launcher executable
- a SHA-256 checksum text file beside the executable
