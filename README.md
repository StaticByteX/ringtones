# Free Retro Game and Demoscene Ringtone Library

![GitHub Pages](https://img.shields.io/badge/hosted%20on-GitHub%20Pages-blue)
![Cloudflare R2](https://img.shields.io/badge/storage-Cloudflare%20R2-orange)
![Static Site](https://img.shields.io/badge/site-static-brightgreen)
![License](https://img.shields.io/badge/license-metadata%20only-lightgrey)

A free web-based ringtone library focused on **retro game music and demoscene classics**.

Users can **search, preview, and download ringtones directly in their browser** — no apps required.

---

# Live Demo

https://staticbytex.github.io/ringtones/

---

# Features

* mobile-friendly design
* instant audio preview
* direct download
* fast search
* infinite scroll (auto loading)
* scalable to thousands of ringtones

---

# Architecture

The project is fully static:

GitHub Pages hosts the website
Cloudflare R2 hosts the audio files

```id="8m0h8d"
GitHub Pages
     ↓
JSON database
     ↓
Cloudflare R2 (MP3 files)
```

---

# Data Structure

Each ringtone is stored as a JSON object.

Example:

```id="m2k7wq"
{
  "id": "delta-theme-c64-v1",

  "title": "Delta Theme",
  "variant": 1,

  "platform": "Commodore 64",

  "composer": {
    "handle": "Rob Hubbard",
    "name": "Rob Hubbard",
    "group": ""
  },

  "production": "Delta",
  "category": "Game",
  "year": 1987,
  "publisher": "Thalamus",

  "tags": [
    "c64",
    "sid",
    "chiptune",
    "retrogaming"
  ],

  "file": "https://bucket.r2.dev/ringtones/c64/delta-theme-c64-v1-rob-hubbard.mp3"
}
```

---

# File Structure

```id="qk6f9u"
index.html
style.css
script.js

data/
  ringtones-c64.json
  ringtones-amiga.json
  ringtones-pc.json
```

---

# Adding a Ringtone

1. Upload MP3 to Cloudflare R2

2. Add entry to the correct JSON file

3. Commit to GitHub

Done.

---

# Naming Convention

```id="tnu1g4"
title-platform-vX-composer.mp3
```

Example:

```id="3q3r4j"
cybernoid-theme-c64-v1-jeroen-tel.mp3
```

---

# Performance

The site uses:

* lazy loading (infinite scroll)
* audio preload disabled
* split JSON files

This ensures fast performance even with **1000+ ringtones**.

---

# Goals

* build a large retro ringtone archive
* preserve classic game music
* make installation simple
* provide a fast and open alternative to ringtone apps

---

# License

Metadata and website code only.

Audio rights belong to original composers and publishers.
