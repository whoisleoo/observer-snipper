<div align="center">


<img src="./public/observer.webp" alt="Observer" width="120" />

<br />

# Observer

**Find the Minecraft username you actually want, without refreshing NameMC by hand.**

![platform](https://img.shields.io/badge/platform-Windows-0d0d0d?style=flat-square)
![stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-0d0d0d?style=flat-square)
![version](https://img.shields.io/badge/version-106-0d0d0d?style=flat-square)

</div>

---

## What it does

Observer is a desktop app that hunts for available Minecraft usernames on your behalf. Instead of guessing names and checking them one at a time, it **generates thousands of candidates from several independent strategies at once**, filters out anything unusable, checks them in bulk against Mojang, and lets you verify the free ones against your own account.
all from one screen, without leaving the app.

It logs in with your Microsoft account, so verification results reflect exactly what you're allowed to claim.

## Generation strategies

Every search can combine any of these sources in the same run:

| Source | What it does |
|---|---|
| **Dictionary** | Real English and Portuguese words, filtered by length (or a length *range*, e.g. 5–10 characters at once) |
| **Markov** | An order-N Markov model trained on the dictionary corpus, inventing new names that *sound* like real words |
| **Deterministic** | Builds names directly from valid syllable structure (onset/coda/vowel tables) — every result is guaranteed pronounceable |
| **Leetspeak** | Letter-substitution variants of dictionary words (`cool` → `c00l`) |
| **Pattern** | Fixed templates like `cvcv` or `ccvc` (consonant/vowel/letter/digit slots), enumerated or sampled |
| **Random** | Pure random combinations — lowest quality, highest volume |


## From candidates to a claimable name

1. **Generate** — build the candidate pool from the sources above, previewed with a real count before anything runs.
2. **Bulk check** — candidates are checked against Mojang's bulk lookup endpoint, batched and rate-limited to stay under Mojang's per-IP limits.
3. **Verify** — the names that came back free are checked one more time against the `/available` endpoint using your own logged-in account, respecting the tighter per-account rate limit Mojang enforces there. 

Both steps show live progress and pause automatically if a rate limit is hit. So that's why it takes a lot of time, depending on how many candidates it finds.

## Also in Observer

- **3D skin viewer** — inspect your current Minecraft skin in the app and preview the nickname you want before claiming it.

- **NameMC** — Don't trust our results? No problem! clicking a nickname takes you to its NameMC page, showing the current owner.

## Stack

- **Runtime**: [Electron](https://www.electronjs.org/) 43, [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for local storage
- **UI**: [React](https://react.dev/) 19 + TypeScript, [Tailwind CSS](https://tailwindcss.com/) 4, [Radix UI](https://www.radix-ui.com/) primitives, [Framer Motion](https://www.framer.com/motion/)
- **3D**: [three.js](https://threejs.org/) + [skin3d](https://skin3d.cosmicfi.dev/#getting-started) for the skin viewer
- **Build**: [electron-vite](https://electron-vite.org/) + [electron-builder](https://www.electron.build/), packaged as a custom portable installer


## Getting started

```bash
git clone https://github.com/whoisleoo/observer-snipper.git
cd observer-snipper
npm install
cp .env.example .env
npm run dev
```

### Building the installer

```bash
npm run installer:build
```

This compiles the app, packages it with `electron-builder`, zips the payload, and produces a self-contained `ObserverSetup.exe` in `dist/installer/`.

## Disclaimer

Observer only automates *checking* availability and reading your own account's claim. it does not bypass Mojang's rate limits or terms of service. Use it responsibly.


