/* script.js 2026-04-04 02:50:24 */
let tracks = [];
let currentFilter = "all";
let currentTypeFilter = "all";
let currentSortKey = "title";
const CHUNK_SIZE = 50;
let renderIndex = 0;
let currentFilteredTracks = [];
let observer = null;
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const norm = (v) => safe(v).toLowerCase();
const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);

/* PLATFORM COLORS FOR FIRST LINE */
function platformColor(platform) {
 if (platform === "C64") return "#f2f540";
 if (platform === "A500") return "#0094ff";
 if (platform === "DOS") return "#ff66ff";
 if (platform === "WIN") return "#66c656";
 return "#ffffff";
}

/* LOAD DATA (UPDATED PATHS) */
async function loadData() {
 const sources = [
  "data/ringtones-c64.json",
  "data/ringtones-amiga.json",
  "data/ringtones-dos.json",
  "data/ringtones-win.json"
 ];
 const results = await Promise.all(
  sources.map((s) => fetch(s).then((r) => r.json()))
 );
 tracks = results.flat();
 render();
}

/* FILTERS */
function setFilter(f) {
 currentFilter = f;
 document
  .querySelectorAll(".filters-platform button[data-filter]")
  .forEach((b) =>
   b.classList.toggle("active", b.dataset.filter === f)
  );
 render();
}
function setTypeFilter(t) {
 currentTypeFilter = t;
 document
  .querySelectorAll(".filters-type button[data-type-filter]")
  .forEach((b) =>
   b.classList.toggle("active", b.dataset.typeFilter === t)
  );
 render();
}

/* SORT */
function setSort(key) {
 currentSortKey = key;
 document
  .querySelectorAll(".sort-buttons button[data-sort]")
  .forEach((b) =>
   b.classList.toggle("active", b.dataset.sort === key)
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
 const searchInput = document.getElementById("search");
 const q = norm(searchInput.value);

 /* show/hide clear button */
 const clearBtn = document.getElementById("search-clear");
 if (clearBtn) {
  clearBtn.classList.toggle("hidden", !q);
 }

 currentFilteredTracks = tracks.filter((t) => {
  const platformKey = norm(t.platform); // "c64","a500","dos","win"
  const matchesPlatform =
   currentFilter === "all" || platformKey === currentFilter;
  const matchesType =
   currentTypeFilter === "all" || t.type === currentTypeFilter;
  const blob = [
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
  return matchesPlatform && matchesType && blob.includes(q);
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
 const accentColor =
  currentFilter === "c64" ? "#f2f540" :
  currentFilter === "a500" ? "#0094ff" :
  currentFilter === "dos" ? "#ff66ff" :
  currentFilter === "win" ? "#66c656" :
  "#ffffff";

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
}

/* OBSERVER (lazy load) */
function setupObserver() {
 if (observer) observer.disconnect();
 const container = document.getElementById("tracklist");
 const sentinel = document.createElement("div");
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

 /* AUDIO */
 const audio = document.createElement("audio");
 audio.controls = true;
 audio.preload = "metadata";

 if (t.file_mp3) {
  const s = document.createElement("source");
  s.src = t.file_mp3;
  s.type = "audio/mpeg";
  audio.appendChild(s);
 }
 if (t.file_m4r) {
  const s = document.createElement("source");
  s.src = t.file_m4r;
  s.type = "audio/mp4";
  audio.appendChild(s);
 }

 /* only one audio at a time */
 audio.addEventListener("play", () => {
  document.querySelectorAll("#tracklist audio").forEach((a) => {
   if (a !== audio) a.pause();
  });
 });

 /* ACTIONS */
 const actions = document.createElement("div");
 actions.className = "track-actions";

 const left = document.createElement("div");
 left.className = "actions-left";

 // iOS: hide MP3 download button (prevents "opens and plays")
 if (!isIOS && t.file_mp3) {
  left.appendChild(dlBtn(t.file_mp3, "assets/android-favicon.png", "MP3"));
 }
 if (t.file_m4r) {
  left.appendChild(dlBtn(t.file_m4r, "assets/apple-favicon.png", "M4R"));
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
 card.append(audio, actions);

 return card;
}

/* HELPERS */
function inlineBox(text) {
 const b = document.createElement("span");
 b.className = "inline-box";
 b.textContent = text;
 return b;
}
function dlBtn(url, icon, label) {
 const a = document.createElement("a");
 a.className = "download-btn";
 a.href = url;
 const filename = url.split("/").pop() || label.toLowerCase();
 a.download = filename;

 a.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
   const response = await fetch(url);
   if (!response.ok) throw new Error("fetch failed");
   const blob = await response.blob();
   const blobUrl = URL.createObjectURL(blob);
   const tmp = document.createElement("a");
   tmp.href = blobUrl;
   tmp.download = filename;
   document.body.appendChild(tmp);
   tmp.click();
   document.body.removeChild(tmp);
   /* revoke after enough time for the download to begin */
   setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch {
   window.open(url, "_blank", "noopener,noreferrer");
  }
 });

 const img = document.createElement("img");
 img.src = icon;
 img.alt = label;
 a.append(img, label);
 return a;
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
 const searchInput = document.getElementById("search");
 const clearBtn = document.getElementById("search-clear");

 if (searchInput) {
  searchInput.addEventListener("input", render);
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
