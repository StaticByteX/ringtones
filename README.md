# Retro Ringtone Library

![GitHub Pages](https://img.shields.io/badge/hosted%20on-GitHub%20Pages-blue)
![Cloudflare R2](https://img.shields.io/badge/storage-Cloudflare%20R2-orange)
![Static Site](https://img.shields.io/badge/site-static-brightgreen)
![License](https://img.shields.io/badge/license-metadata%20only-lightgrey)

A **free web-based ringtone library** featuring music from classic computer games and the demoscene.

The goal of the project is to make it extremely easy to **discover, preview, and download retro ringtones directly from a mobile browser** — without requiring any apps.

The project focuses primarily on game and demoscene music from:

* Commodore 64
* Amiga
* DOS / early Windows PC

---

# Live Demo

Example site:

```
https://yourusername.github.io/retro-ringtones
```

Users can:

* preview ringtones directly in the browser
* download them instantly
* search by composer, game or platform

---

# Screenshots

*(Optional section – add screenshots later)*

Example layout:

```
Homepage with ringtone search
Ringtone player and download buttons
Platform categories (C64, Amiga, PC)
```

---

# Project Architecture

The site is **100% static**.

This makes it extremely fast, free to host, and easy to maintain.

```
GitHub Pages (website)
        ↓
ringtones.json (metadata)
        ↓
MP3 files hosted on Cloudflare R2
```

Advantages:

* unlimited scalability
* very fast page loads
* no backend required
* minimal maintenance

---

# Repository Structure

```
retro-ringtones
│
├── index.html
├── script.js
├── style.css
│
├── data
│   ├── ringtones.csv
│   └── ringtones.json
│
├── scripts
│   └── generate.js
│
└── README.md
```

---

# Ringtone File Naming

Ringtones follow a consistent and SEO-friendly naming scheme.

```
title-vX-platform-composer.mp3
```

Example:

```
cybernoid-v1-c64-jeroen-tel.mp3
monty-on-the-run-theme-v1-c64-rob-hubbard.mp3
hardwired-v1-amiga-jesper-kyd.mp3
```

Rules:

* lowercase only
* hyphen-separated words
* ASCII characters only
* no spaces

---

# Cloudflare R2 Storage

Ringtone audio files are stored in Cloudflare R2 instead of the GitHub repository.

Example structure:

```
/ringtones
    /c64
    /amiga
    /pc
```

Example URL:

```
https://yourbucket.r2.dev/ringtones/c64/cybernoid-v1-c64-jeroen-tel.mp3
```

---

# Adding a New Ringtone

The workflow is intentionally simple.

### 1. Upload ringtone to Cloudflare R2

Example:

```
/ringtones/c64/cybernoid-v3-c64-jeroen-tel.mp3
```

### 2. Add entry to the database

Edit:

```
data/ringtones.csv
```

Example entry:

```
Cybernoid,3,c64,Jeroen Tel,Cybernoid,1988
```

### 3. Generate JSON database

Run:

```
node scripts/generate.js
```

This updates:

```
data/ringtones.json
```

### 4. Commit to GitHub

GitHub Pages will automatically deploy the update.

---

# Features

* mobile-friendly ringtone player
* direct ringtone downloads
* simple browser search
* automatic platform grouping
* scalable architecture
* SEO-friendly structure

---

# Content Focus

The archive focuses on iconic retro music from game composers and demoscene musicians.

Examples include:

* Rob Hubbard
* Jeroen Tel
* Ben Daglish
* Jesper Kyd
* Matthew Simmonds

---

# Long-Term Goals

* build a large searchable archive of retro ringtones
* preserve classic game music
* make installation simple for mobile users
* create a fast and open ringtone resource

---

# License

This repository contains **website code and metadata only**.

Audio files are hosted separately.

Music copyrights remain with their respective composers and rights holders.
