/* script.js — StaticByteX */
let tracks = [];
let currentFilter = "all";
let currentTypeFilter = "all";
let currentSortKey = "title";
const CHUNK_SIZE = 50;
let renderIndex = 0;
let currentFilteredTracks = [];
let observer = null;
let sentinel = null;
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const norm = (v) => safe(v).toLowerCase();
const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);

/* collapse rapid calls (e.g. keystrokes) into one */
function debounce(fn, delay) {
 let id;
 return (...args) => {
  clearTimeout(id);
  id = setTimeout(() => fn(...args), delay);
 };
}

/* precompute search blob, sort keys, and composer key once per track */
function indexTrack(t) {
 const c = t.composer || {};
 t._platformKey = norm(t.platform);
 t._composerKey = safe(c.handle) + safe(c.name);
 t._sort = {
  title: norm(t.title),
  handle: norm(c.handle),
  name: norm(c.name),
  group: norm(c.group),
  production: norm(t.production),
  publisher: norm(t.publisher)
 };
 t._search = [
  t.title,
  t.production,
  t.publisher,
  t.year,
  t.category,
  t.platform,
  t.variant,
  t.type,
  safe(c.handle),
  safe(c.name),
  safe(c.group),
  ...(t.tags || [])
 ]
  .join(" ")
  .toLowerCase();
 return t;
}

/* platform palette — single source of truth */
const DEFAULT_COLOR = "#ffffff";
const PLATFORM_COLORS = {
 c64: "#f2f540",
 a500: "#0094ff",
 dos: "#ff66ff",
 win: "#66c656"
};
function platformColor(platform) {
 return PLATFORM_COLORS[norm(platform)] || DEFAULT_COLOR;
}

/* SHARED AUDIO PLAYER — one <audio> in the sticky bar serves the whole list */
const playerState = { audio: null, trackId: null };

function getPlayer() {
 if (!playerState.audio) playerState.audio = document.getElementById("player");
 return playerState.audio;
}

/* sync only the buttons whose state can differ: marked ones + current track */
function refreshPlayButtons() {
 const audio = getPlayer();
 const playing = !!audio && !audio.paused && !audio.ended;
 const id = playerState.trackId;
 let sel = ".play-btn.playing, .play-btn.active-track";
 if (id) sel += `, .play-btn[data-track-id="${CSS.escape(id)}"]`;
 document.querySelectorAll(sel).forEach((b) => {
  const isActive = b.dataset.trackId === id;
  const isPlaying = isActive && playing;
  b.classList.toggle("playing", isPlaying);
  b.classList.toggle("active-track", isActive);
  b.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  b.setAttribute("aria-pressed", String(isPlaying));
 });
}

function updateNowPlaying(t) {
 const bar = document.getElementById("player-bar");
 if (bar) bar.hidden = false;
 document.body.classList.add("has-player");
 const titleEl = document.getElementById("player-title");
 const subEl = document.getElementById("player-sub");
 if (titleEl) {
  titleEl.textContent = safe(t.title);
  titleEl.style.color = platformColor(t.platform);
 }
 if (subEl) {
  const c = t.composer || {};
  const handle = safe(c.handle);
  const name = safe(c.name);
  const who = handle && name ? `${handle} (${name})` : handle || name;
  subEl.textContent = [who, safe(t.platform)].filter(Boolean).join(" • ");
 }
}

/* same track -> pause/resume; different track -> load and play */
function togglePlay(t) {
 const audio = getPlayer();
 if (!audio) return;
 const src = t.file_mp3 || t.file_m4r;
 if (!src) return;

 if (playerState.trackId === t.id) {
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
  return;
 }

 playerState.trackId = t.id;
 audio.src = src;
 updateNowPlaying(t);
 audio.play().catch(() => {});
 refreshPlayButtons();
}

function playButton(t, color) {
 const btn = document.createElement("button");
 btn.type = "button";
 btn.className = "play-btn";
 btn.dataset.trackId = t.id || "";
 btn.setAttribute("aria-label", "Play");
 btn.setAttribute("aria-pressed", "false");
 if (color) btn.style.color = color;
 btn.addEventListener("click", () => togglePlay(t));
 return btn;
}

/* DATA LOADING */
function showEmptyMessage(message) {
 const container = document.getElementById("tracklist");
 if (!container) return;
 const p = document.createElement("p");
 p.className = "load-error";
 p.textContent = message;
 container.replaceChildren(p);
}

async function loadData() {
 const sources = [
  "data/ringtones-c64.json",
  "data/ringtones-amiga.json",
  "data/ringtones-dos.json",
  "data/ringtones-win.json"
 ];

 /* allSettled: one failed source must not blank the whole page */
 const results = await Promise.allSettled(
  sources.map((s) =>
   fetch(s).then((r) => {
    if (!r.ok) throw new Error(`${s}: HTTP ${r.status}`);
    return r.json();
   })
  )
 );

 const failed = results.filter((res) => res.status === "rejected");
 if (failed.length) {
  console.error("Some track sources failed:", failed.map((f) => f.reason));
 }

 tracks = results
  .filter((res) => res.status === "fulfilled")
  .flatMap((res) => res.value)
  .map(indexTrack);

 if (!tracks.length) {
  showEmptyMessage("Couldn't load any tracks. Please try again later.");
  return;
 }

 render();
}

/* FILTERS & SORT */
function setActive(buttons, isActive) {
 buttons.forEach((b) => {
  const active = isActive(b);
  b.classList.toggle("active", active);
  b.setAttribute("aria-pressed", String(active));
 });
}
function setFilter(f) {
 currentFilter = f;
 setActive(
  document.querySelectorAll(".filters-platform button[data-filter]"),
  (b) => b.dataset.filter === f
 );
 render();
}
function setTypeFilter(t) {
 currentTypeFilter = t;
 setActive(
  document.querySelectorAll(".filters-type button[data-type-filter]"),
  (b) => b.dataset.typeFilter === t
 );
 render();
}
function setSort(key) {
 currentSortKey = key;
 setActive(
  document.querySelectorAll(".sort-buttons button[data-sort]"),
  (b) => b.dataset.sort === key
 );
 render();
}

function plural(n, one, many) {
 return n === 1 ? one : many;
}

/* RENDER */
function render() {
 const container = document.getElementById("tracklist");
 container.replaceChildren();
 renderIndex = 0;
 sentinel = null;
 const searchInput = document.getElementById("search");
 const q = norm(searchInput.value);

 const clearBtn = document.getElementById("search-clear");
 if (clearBtn) clearBtn.classList.toggle("hidden", !q);

 currentFilteredTracks = tracks.filter((t) => {
  const matchesPlatform =
   currentFilter === "all" || t._platformKey === currentFilter;
  const matchesType =
   currentTypeFilter === "all" || t.type === currentTypeFilter;
  return matchesPlatform && matchesType && t._search.includes(q);
 });

 /* sort on precomputed keys; tie-break by title */
 const key = currentSortKey;
 currentFilteredTracks.sort((a, b) => {
  const av = a._sort[key] ?? a._sort.title;
  const bv = b._sort[key] ?? b._sort.title;
  if (av < bv) return -1;
  if (av > bv) return 1;
  const at = a._sort.title;
  const bt = b._sort.title;
  if (at < bt) return -1;
  if (at > bt) return 1;
  return 0;
 });

 /* stats */
 const composerSet = new Set();
 const productionSet = new Set();
 const publisherSet = new Set();
 currentFilteredTracks.forEach((t) => {
  if (t._composerKey) composerSet.add(t._composerKey);
  if (t.production) productionSet.add(t.production);
  if (t.publisher) publisherSet.add(t.publisher);
 });

 const accentColor = PLATFORM_COLORS[currentFilter] || DEFAULT_COLOR;

 const resultsInfo = document.getElementById("results-info");
 if (resultsInfo) {
  const tCount = currentFilteredTracks.length;
  const cCount = composerSet.size;
  const prCount = productionSet.size;
  const puCount = publisherSet.size;
  resultsInfo.innerHTML = `
 <span style="color:${accentColor}">${tCount}</span> ${plural(tCount, "track", "tracks")} •
 <span style="color:${accentColor}">${cCount}</span> ${plural(cCount, "composer", "composers")} •
 <span style="color:${accentColor}">${prCount}</span> ${plural(prCount, "production", "productions")} •
 <span style="color:${accentColor}">${puCount}</span> ${plural(puCount, "publisher", "publishers")}<br>
 <br>
 `;
 }

 if (!currentFilteredTracks.length) {
  showEmptyMessage("No tracks match your search — try different words or filters.");
  return;
 }

 renderNextChunk();
 setupObserver();
}

/* CHUNKED RENDERING — batch each chunk through a fragment (one reflow) */
function renderNextChunk() {
 const container = document.getElementById("tracklist");
 const frag = document.createDocumentFragment();
 currentFilteredTracks
  .slice(renderIndex, renderIndex + CHUNK_SIZE)
  .forEach((t) => frag.appendChild(buildTrack(t)));
 container.appendChild(frag);
 renderIndex += CHUNK_SIZE;

 /* new buttons must reflect the shared player's state */
 refreshPlayButtons();

 /* keep the sentinel below the newest cards; drop it when done */
 if (sentinel) {
  if (renderIndex >= currentFilteredTracks.length) {
   sentinel.remove();
  } else {
   container.appendChild(sentinel);
  }
 }
}

/* lazy-load further chunks as the sentinel nears the viewport */
function setupObserver() {
 if (observer) observer.disconnect();
 const container = document.getElementById("tracklist");
 if (renderIndex >= currentFilteredTracks.length) return;
 sentinel = document.createElement("div");
 sentinel.style.height = "1px";
 container.appendChild(sentinel);

 observer = new IntersectionObserver(
  (entries) => {
   if (!entries[0].isIntersecting) return;
   if (renderIndex >= currentFilteredTracks.length) return;
   renderNextChunk();
  },
  { rootMargin: "200px" }
 );
 observer.observe(sentinel);
}

/* TRACK CARD */
const PLATFORM_LOGOS = {
 C64: "assets/c64-logo.png",
 A500: "assets/a500-logo.png",
 DOS: "assets/dos-logo.png",
 WIN: "assets/win-logo.png"
};

function buildTrack(t) {
 const color = platformColor(t.platform);
 const card = document.createElement("div");
 card.className = `track ${t._platformKey}`;

 const logoSrc = PLATFORM_LOGOS[t.platform];
 if (logoSrc) {
  const logo = document.createElement("img");
  logo.className = "track-platform-logo";
  logo.loading = "lazy";
  logo.decoding = "async";
  logo.src = logoSrc;
  logo.alt = `${t.platform} logo`;
  card.appendChild(logo);
 }

 /* line 1: title + chips (category · platform · variant) */
 const titleRow = document.createElement("div");
 titleRow.className = "track-title";
 titleRow.style.color = color;

 const title = document.createElement("div");
 title.className = "track-title-main";
 title.textContent = safe(t.title);

 const year = t.year != null ? String(t.year) : "";

 const meta = document.createElement("div");
 meta.className = "track-inline-meta";
 if (t.category) meta.appendChild(inlineBox(safe(t.category).toUpperCase()));
 meta.appendChild(inlineBox(safe(t.platform)));
 meta.appendChild(inlineBox(`v${safe(t.variant)}`));

 titleRow.append(title, meta);

 const hasSampling =
  t.sampling && (t.sampling.title || t.sampling.artist || t.sampling.year);

 /* line 2: artist — parentheses mean one thing: real name after a handle */
 const line2 = document.createElement("div");
 line2.className = "track-line";
 const comp = t.composer || {};
 const handle = safe(comp.handle);
 const name = safe(comp.name);
 const group = safe(comp.group);

 let artist = "";
 if (handle && name) artist = `${handle} (${name})`;
 else if (handle) artist = handle;
 else if (name) artist = name;
 if (group) artist = artist ? `${artist} · ${group}` : group;
 line2.textContent = artist;

 /* line 3: production · publisher · year, de-duplicated against title/group */
 const line3 = document.createElement("div");
 line3.className = "track-line";
 const prod = safe(t.production);
 const pub = safe(t.publisher);
 const provParts = [];
 if (prod && norm(prod) !== t._sort.title) provParts.push(prod);
 if (pub && norm(pub) !== norm(group)) provParts.push(pub);
 if (year) provParts.push(year);
 line3.textContent = provParts.join(" · ");

 /* line 4: "Based on <title · artist · year>" */
 let line4 = null;
 if (hasSampling) {
  line4 = document.createElement("div");
  line4.className = "track-line";
  const sParts = [
   safe(t.sampling.title),
   safe(t.sampling.artist),
   t.sampling.year != null ? String(t.sampling.year) : ""
  ].filter(Boolean);
  if (sParts.length) {
   const lead = document.createElement("span");
   lead.className = "based-on";
   lead.textContent = "Based on ";
   line4.append(lead, document.createTextNode(sParts.join(" · ")));
  }
 }

 /* actions: play, downloads (iOS hides Android), type badge */
 const actions = document.createElement("div");
 actions.className = "track-actions";

 const left = document.createElement("div");
 left.className = "actions-left";

 if (t.file_mp3 || t.file_m4r) {
  left.appendChild(playButton(t, color));
 }
 if (!isIOS && t.file_mp3) {
  left.appendChild(dlBtn(t.file_mp3, "assets/android-favicon.png", "Android"));
 }
 if (t.file_m4r) {
  left.appendChild(
   dlBtn(t.file_m4r, "assets/apple-favicon.png", "iPhone", { iosRingtone: true })
  );
  if (isIOS) left.appendChild(iosHelpButton(t));
 }

 const type = document.createElement("div");
 type.className = `track-type ${safe(t.type).toLowerCase()}`;
 type.textContent = safe(t.type);

 actions.append(left, type);

 card.append(titleRow);
 if (line2.textContent.trim()) card.append(line2);
 if (line3.textContent.trim()) card.append(line3);
 if (line4 && line4.textContent.trim()) card.append(line4);
 card.append(actions);

 return card;
}

/* HELPERS */
function inlineBox(text) {
 const b = document.createElement("span");
 b.className = "inline-box";
 b.textContent = text;
 return b;
}

/* iOS RINGTONE HELP — walkthrough shown until acknowledged, recallable via ⓘ */
const IOS_HELP_KEY = "sbx_ios_help_shown";
function iosHelpShown() {
 try {
  return sessionStorage.getItem(IOS_HELP_KEY) === "1";
 } catch {
  return false;
 }
}
function markIosHelpShown() {
 try {
  sessionStorage.setItem(IOS_HELP_KEY, "1");
 } catch {
  /* private mode — skip persistence */
 }
}

/* Firefox iOS mangles blob-download filenames; it gets the share sheet instead */
const isFxIOS = isIOS && /FxiOS/i.test(navigator.userAgent);

/* save via blob — never navigate to the audio URL (iOS would just play it) */
async function saveFile(url, filename) {
 try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();

  /* Firefox iOS: share sheet keeps the exact filename + .m4r extension */
  if (isFxIOS && navigator.canShare) {
   const file = new File([blob], filename, { type: blob.type || "audio/mp4" });
   if (navigator.canShare({ files: [file] })) {
    try {
     await navigator.share({ files: [file] });
     return;
    } catch (err) {
     if (err && err.name === "AbortError") return; /* user closed the sheet */
    }
   }
  }

  const blobUrl = URL.createObjectURL(blob);
  const tmp = document.createElement("a");
  tmp.href = blobUrl;
  tmp.download = filename;
  document.body.appendChild(tmp);
  tmp.click();
  document.body.removeChild(tmp);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
 } catch (err) {
  console.error("Ringtone download failed:", err);
 }
}

/* one gesture = at most one download (iOS can deliver ghost clicks) */
let downloadActionAt = 0;
function claimDownloadAction() {
 const now = Date.now();
 if (now - downloadActionAt < 450) return false;
 downloadActionAt = now;
 return true;
}

let pendingDownload = null;
let modalOpenedAt = 0;

function openIosHelp(url, filename) {
 pendingDownload = url ? { url, filename } : null;
 const modal = document.getElementById("ios-help");
 if (!modal) {
  if (url) saveFile(url, filename);
  return;
 }
 const dl = document.getElementById("ios-help-download");
 if (dl) dl.hidden = !url; /* generic ⓘ has no file to offer */
 modal.hidden = false;
 modalOpenedAt = Date.now();
 document.body.classList.add("modal-open");
 const close = modal.querySelector(".modal-close");
 if (close) close.focus();
}
function closeIosHelp() {
 const modal = document.getElementById("ios-help");
 if (modal) modal.hidden = true;
 document.body.classList.remove("modal-open");
}
function iosHelpButton(t) {
 const b = document.createElement("button");
 b.type = "button";
 b.className = "help-btn";
 b.setAttribute("aria-label", "How to set as iPhone ringtone");
 const url = t && t.file_m4r ? t.file_m4r : "";
 const filename = url.split("/").pop() || "ringtone.m4r";
 b.addEventListener("click", () => openIosHelp(url, filename));
 return b;
}

/* download control is a <button> — Firefox iOS follows anchor hrefs regardless */
function dlBtn(url, icon, label, opts = {}) {
 const b = document.createElement("button");
 b.type = "button";
 b.className = "download-btn";
 b.setAttribute("aria-label", `Download for ${label}`);
 const filename = url.split("/").pop() || label.toLowerCase();

 b.addEventListener("click", () => {
  /* iOS first tap per session opens the walkthrough (download lives inside) */
  if (opts.iosRingtone && isIOS && !iosHelpShown()) {
   openIosHelp(url, filename);
   return;
  }
  const modal = document.getElementById("ios-help");
  if (modal && !modal.hidden) return; /* ghost click while modal is open */
  if (!claimDownloadAction()) return;
  saveFile(url, filename);
 });

 const img = document.createElement("img");
 img.src = icon;
 img.alt = "";
 img.loading = "lazy";
 img.decoding = "async";
 b.append(img, document.createTextNode(label));
 return b;
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
 const searchInput = document.getElementById("search");
 const clearBtn = document.getElementById("search-clear");

 /* mirror the shared player's state onto the card buttons */
 const player = getPlayer();
 if (player) {
  ["play", "pause", "ended"].forEach((ev) =>
   player.addEventListener(ev, refreshPlayButtons)
  );
 }

 /* iOS help modal — 350ms guard swallows the ghost click after opening */
 const iosHelp = document.getElementById("ios-help");
 if (iosHelp) {
  iosHelp.querySelectorAll("[data-close]").forEach((el) =>
   el.addEventListener("click", () => {
    if (Date.now() - modalOpenedAt < 350) return;
    closeIosHelp();
   })
  );
  const dlLink = document.getElementById("ios-help-download");
  if (dlLink) {
   dlLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (Date.now() - modalOpenedAt < 350) return;
    if (!claimDownloadAction()) return;
    if (pendingDownload) saveFile(pendingDownload.url, pendingDownload.filename);
    markIosHelpShown(); /* downloading acknowledges the guide too */
    closeIosHelp();
   });
  }
  const gotIt = document.getElementById("ios-help-gotit");
  if (gotIt) {
   gotIt.addEventListener("click", () => {
    if (Date.now() - modalOpenedAt < 350) return;
    markIosHelpShown();
    closeIosHelp();
   });
  }
  document.addEventListener("keydown", (e) => {
   if (e.key === "Escape" && !iosHelp.hidden) closeIosHelp();
  });
 }

 if (searchInput) {
  searchInput.addEventListener("input", debounce(render, 150));
 }
 if (clearBtn) {
  clearBtn.addEventListener("click", () => {
   searchInput.value = "";
   render();
  });
 }

 document
  .querySelectorAll(".filters-platform button[data-filter]")
  .forEach((b) =>
   b.addEventListener("click", () => setFilter(b.dataset.filter))
  );

 document
  .querySelectorAll(".filters-type button[data-type-filter]")
  .forEach((b) =>
   b.addEventListener("click", () => setTypeFilter(b.dataset.typeFilter))
  );

 document
  .querySelectorAll(".sort-buttons button[data-sort]")
  .forEach((b) =>
   b.addEventListener("click", () => setSort(b.dataset.sort))
  );
});

/* start fetching data immediately — the script sits at the end of <body> */
loadData();
