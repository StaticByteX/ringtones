/* script.js 2026-04-04 02:50:24 */
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

/* debounce: collapse rapid calls (e.g. keystrokes) into one */
function debounce(fn, delay) {
 let id;
 return (...args) => {
  clearTimeout(id);
  id = setTimeout(() => fn(...args), delay);
 };
}

/* precompute the lowercase search blob + platform key once per track,
   so filtering doesn't rebuild them on every keystroke */
function indexTrack(t) {
 t._platformKey = norm(t.platform);
 t._search = [
  t.title,
  t.production,
  t.publisher,
  t.year,
  t.category,
  t.platform,
  t.variant,
  t.type,
  safe(t.composer?.handle),
  safe(t.composer?.name),
  safe(t.composer?.group),
  ...(t.tags || [])
 ]
  .join(" ")
  .toLowerCase();
 return t;
}

/* PLATFORM PALETTE — single source of truth, keyed by lowercase platform */
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

/* SHARED AUDIO PLAYER
   One <audio> element in a sticky bottom bar serves the entire list, so the
   page holds a single media widget instead of one per track (hundreds of
   native players is what overwhelmed mobile WebKit). Each card carries a
   lightweight play button that just points the shared player at its file. */
const playerState = { audio: null, trackId: null };

function getPlayer() {
 if (!playerState.audio) playerState.audio = document.getElementById("player");
 return playerState.audio;
}

/* sync every rendered play button to the shared player's state */
function refreshPlayButtons() {
 const audio = getPlayer();
 const playing = !!audio && !audio.paused && !audio.ended;
 document.querySelectorAll(".play-btn").forEach((b) => {
  const isActive = b.dataset.trackId === playerState.trackId;
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

function togglePlay(t) {
 const audio = getPlayer();
 if (!audio) return;
 const src = t.file_mp3 || t.file_m4r;
 if (!src) return;

 /* same track -> pause/resume; different track -> load and play */
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
 if (color) btn.style.color = color;
 btn.addEventListener("click", () => togglePlay(t));
 return btn;
}

/* LOAD DATA (UPDATED PATHS) */
function showLoadError(message) {
 const container = document.getElementById("tracklist");
 if (!container) return;
 container.textContent = "";
 const p = document.createElement("p");
 p.className = "load-error";
 p.textContent = message;
 container.appendChild(p);
}

async function loadData() {
 const sources = [
  "data/ringtones-c64.json",
  "data/ringtones-amiga.json",
  "data/ringtones-dos.json",
  "data/ringtones-win.json"
 ];

 /* allSettled so a single failed/malformed source doesn't blank the page */
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
  console.error(
   "Some track sources failed to load:",
   failed.map((f) => f.reason)
  );
 }

 tracks = results
  .filter((res) => res.status === "fulfilled")
  .flatMap((res) => res.value)
  .map(indexTrack);

 if (!tracks.length) {
  showLoadError("Couldn't load any tracks. Please try again later.");
  return;
 }

 render();
}

/* FILTERS */
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

/* SORT */
function setSort(key) {
 currentSortKey = key;
 setActive(
  document.querySelectorAll(".sort-buttons button[data-sort]"),
  (b) => b.dataset.sort === key
 );
 render();
}
function sortValue(track) {
 const c = track.composer || {};
 switch (currentSortKey) {
 case "title":
  return norm(track.title);
 case "handle":
  return norm(c.handle);
 case "name":
  return norm(c.name);
 case "group":
  return norm(c.group);
 case "production":
  return norm(track.production);
 case "publisher":
  return norm(track.publisher);
 default:
  return norm(track.title);
 }
}

function plural(n, one, many) {
 return n === 1 ? one : many;
}

/* RENDER */
function render() {
 const container = document.getElementById("tracklist");
 container.innerHTML = "";
 renderIndex = 0;
 sentinel = null;
 const searchInput = document.getElementById("search");
 const q = norm(searchInput.value);

 /* show/hide clear button */
 const clearBtn = document.getElementById("search-clear");
 if (clearBtn) {
  clearBtn.classList.toggle("hidden", !q);
 }

 currentFilteredTracks = tracks.filter((t) => {
  const matchesPlatform =
   currentFilter === "all" || t._platformKey === currentFilter;
  const matchesType =
   currentTypeFilter === "all" || t.type === currentTypeFilter;
  return matchesPlatform && matchesType && t._search.includes(q);
 });

 /* SORT */
 currentFilteredTracks.sort((a, b) => {
  const av = sortValue(a);
  const bv = sortValue(b);
  if (av < bv) return -1;
  if (av > bv) return 1;
  // tie-breaker by title
  const at = norm(a.title);
  const bt = norm(b.title);
  if (at < bt) return -1;
  if (at > bt) return 1;
  return 0;
 });

 /* STATS (12–15) */
 const composerSet = new Set();
 const productionSet = new Set();
 const publisherSet = new Set();
 const categorySet = new Set();
 currentFilteredTracks.forEach((t) => {
  const h = safe(t.composer?.handle);
  const n = safe(t.composer?.name);
  const key = h + n;
  if (key) composerSet.add(key);
  if (t.production) productionSet.add(t.production);
  if (t.publisher) publisherSet.add(t.publisher);
  if (t.category) {
   t.category.split("\n").forEach((c) => {
    const cc = c.trim();
    if (cc) categorySet.add(cc);
   });
  }
 });

 /* ACCENT COLOR FOR ALL NUMBERS (16) */
 const accentColor = PLATFORM_COLORS[currentFilter] || DEFAULT_COLOR;

 /* RESULTS INFO (no categories; pluralization; line break after publishers) */
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

 renderNextChunk();
 setupObserver();
}

/* CHUNKED RENDERING */
function renderNextChunk() {
 const container = document.getElementById("tracklist");
 currentFilteredTracks
  .slice(renderIndex, renderIndex + CHUNK_SIZE)
  .forEach((t) => container.appendChild(buildTrack(t)));
 renderIndex += CHUNK_SIZE;

 /* newly added buttons should reflect the shared player's current state */
 refreshPlayButtons();

 /* keep the sentinel pinned to the bottom of the list so the observer keeps
    firing on subsequent chunks; drop it once everything has rendered */
 if (sentinel) {
  if (renderIndex >= currentFilteredTracks.length) {
   sentinel.remove();
  } else {
   container.appendChild(sentinel);
  }
 }
}

/* OBSERVER (lazy load) */
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

/* BUILD TRACK CARD */
function buildTrack(t) {
 const color = platformColor(t.platform);
 const platformKey = norm(t.platform); // c64/a500/dos/win
 const card = document.createElement("div");
 card.className = `track ${platformKey}`;

 /* PLATFORM LOGO (6–7) */
 const logo = document.createElement("img");
 logo.className = "track-platform-logo";
 logo.loading = "lazy";
 logo.decoding = "async";
 if (t.platform === "C64") logo.src = "assets/c64-logo.png";
 else if (t.platform === "A500") logo.src = "assets/a500-logo.png";
 else if (t.platform === "DOS") logo.src = "assets/dos-logo.png";
 else if (t.platform === "WIN") logo.src = "assets/win-logo.png";
 else logo.src = "";
 logo.alt = `${t.platform} logo`;
 if (logo.src) card.appendChild(logo);

 /* LINE 1: TITLE + META */
 const titleRow = document.createElement("div");
 titleRow.className = "track-title";
 titleRow.style.color = color;

 const title = document.createElement("div");
 title.className = "track-title-main";
 title.textContent = safe(t.title);

 const meta = document.createElement("div");
 meta.className = "track-inline-meta";
 if (t.category) meta.appendChild(inlineBox(safe(t.category).toUpperCase()));
 meta.appendChild(inlineBox(safe(t.platform)));
 meta.appendChild(inlineBox(`v${safe(t.variant)}`));

 titleRow.append(title, meta);

 /* SAMPLING FLAG (10) */
 const hasSampling =
  t.sampling &&
  (t.sampling.title ||
   t.sampling.artist ||
   t.sampling.year);

 const year = t.year != null ? String(t.year) : "";

 /* LINE 2: COMPOSER
  - If sampling exists -> NO year
  - If sampling does NOT exist -> include year
 */
 const line2 = document.createElement("div");
 line2.className = "track-line";
 const comp = t.composer || {};
 const handle = safe(comp.handle);
 const name = safe(comp.name);
 const group = safe(comp.group);

 let composerCore = "";
 if (handle && name) composerCore = `${handle} (${name})`;
 else if (handle) composerCore = handle;
 else if (name) composerCore = name;
 if (group) composerCore = composerCore ? `${composerCore} – ${group}` : group;

 if (!hasSampling) {
  // show year if available
  line2.textContent = composerCore && year ? `${composerCore}, ${year}` : (composerCore || year);
 } else {
  // no year when sampling exists
  line2.textContent = composerCore;
 }

 /* LINE 3: PRODUCTION (11)
  If production and publisher are null -> omit line3
  Else robust formatting without '(, 2022)'
 */
 const line3 = document.createElement("div");
 line3.className = "track-line";
 const prod = safe(t.production);
 const pub = safe(t.publisher);

 if (!prod && !pub) {
  line3.textContent = "";
 } else {
  const bits = [];
  if (pub) bits.push(pub);
  if (year) bits.push(year);
  if (prod) {
   line3.textContent = bits.length ? `${prod} (${bits.join(", ")})` : prod;
  } else {
   line3.textContent = bits.join(", ");
  }
 }

 /* LINE 4: SAMPLING */
 let line4 = null;
 if (hasSampling) {
  line4 = document.createElement("div");
  line4.className = "track-line";
  const sTitle = safe(t.sampling.title);
  const sArtist = safe(t.sampling.artist);
  const sYear = t.sampling.year != null ? String(t.sampling.year) : "";
  const inner = [sArtist, sYear].filter(Boolean).join(", ");
  const sampleText = sTitle
   ? (inner ? `${sTitle} (${inner})` : sTitle)
   : inner;
  line4.textContent = sampleText ? `Contains elements from: ${sampleText}` : "";
 }

 /* ACTIONS */
 const actions = document.createElement("div");
 actions.className = "track-actions";

 const left = document.createElement("div");
 left.className = "actions-left";

 /* play button -> drives the single shared player in the sticky bar */
 if (t.file_mp3 || t.file_m4r) {
  left.appendChild(playButton(t, color));
 }

 // iOS: hide the Android (MP3) button — only the iPhone format applies there
 if (!isIOS && t.file_mp3) {
  left.appendChild(dlBtn(t.file_mp3, "assets/android-favicon.png", "Android"));
 }
 if (t.file_m4r) {
  left.appendChild(
   dlBtn(t.file_m4r, "assets/apple-favicon.png", "iPhone", { iosRingtone: true })
  );
  if (isIOS) left.appendChild(iosHelpButton());
 }

 const type = document.createElement("div");
 type.className = `track-type ${safe(t.type).toLowerCase()}`;
 type.textContent = safe(t.type);

 actions.append(left, type);

 /* ASSEMBLE */
 card.append(titleRow);
 if (line2.textContent.trim()) card.append(line2);
 // only show line3 when it has content (11)
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
/* iOS RINGTONE HELP
   iPhones can't set a ringtone straight from the browser (Apple blocks it),
   so the iPhone download is paired with a short GarageBand walkthrough shown
   once per session (sessionStorage) and reachable any time via the ⓘ button. */
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
  /* private mode etc. — just skip persistence */
 }
}
/* download a file as a real save by fetching it and saving the blob. We never
   navigate to / open the audio URL itself, because iOS Safari just plays it
   (and would spawn a second tab). Requires the bucket's CORS policy to allow
   this origin — which it now does. */
async function saveFile(url, filename) {
 try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
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

/* collapse rapid duplicate triggers: iOS can deliver a second "ghost" click
   for a single tap, which previously slipped through to a second download /
   playback. One gesture should cause at most one download. */
let downloadActionAt = 0;
function claimDownloadAction() {
 const now = Date.now();
 if (now - downloadActionAt < 450) return false; // covers the ~250-350ms ghost
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
 if (dl) dl.hidden = !url; // hide the download when opened from the generic ⓘ
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
function iosHelpButton() {
 const b = document.createElement("button");
 b.type = "button";
 b.className = "help-btn";
 b.setAttribute("aria-label", "How to set as iPhone ringtone");
 b.addEventListener("click", () => openIosHelp());
 return b;
}

function dlBtn(url, icon, label, opts = {}) {
 const a = document.createElement("a");
 a.className = "download-btn";
 a.href = url;
 const filename = url.split("/").pop() || label.toLowerCase();
 a.download = filename;

 /* Always handle the tap ourselves — never navigate straight to the audio
    file, or iOS Safari just plays it (and leaves the page). On iOS the first
    iPhone download per session opens the ringtone walkthrough; otherwise we
    trigger a real save. */
 a.addEventListener("click", (e) => {
  e.preventDefault();
  /* iOS, first time this session: show the walkthrough (download lives in it) */
  if (opts.iosRingtone && isIOS && !iosHelpShown()) {
   markIosHelpShown();
   openIosHelp(url, filename);
   return;
  }
  /* ignore an iOS "ghost" click that lands while the walkthrough is open */
  const modal = document.getElementById("ios-help");
  if (modal && !modal.hidden) return;
  if (!claimDownloadAction()) return;
  saveFile(url, filename);
 });

 const img = document.createElement("img");
 img.src = icon;
 img.alt = "";
 img.loading = "lazy";
 img.decoding = "async";
 a.append(img, document.createTextNode(label));
 return a;
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
 const searchInput = document.getElementById("search");
 const clearBtn = document.getElementById("search-clear");

 /* keep card buttons in sync when the shared player changes state,
    including when the user drives it from the bar's own controls */
 const player = getPlayer();
 if (player) {
  ["play", "pause", "ended"].forEach((ev) =>
   player.addEventListener(ev, refreshPlayButtons)
  );
 }

 /* iOS ringtone help modal: close via ×, backdrop, Esc; download via blob.
    The 350ms guard ignores the "ghost click" iOS can deliver right after the
    modal opens (which previously closed it or triggered playback). */
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
    if (Date.now() - modalOpenedAt < 350) return; // ignore ghost click
    if (!claimDownloadAction()) return;
    if (pendingDownload) saveFile(pendingDownload.url, pendingDownload.filename);
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

 loadData();
});
