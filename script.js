let tracks = [];
let currentFilter = "all";
let currentTypeFilter = "all";

const CHUNK_SIZE = 50;
let renderIndex = 0;
let currentFilteredTracks = [];
let observer = null;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

/* ================================
   HELPERS
================================ */
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const norm = (v) => safe(v).toLowerCase();

function formatDuration(seconds) {
  if (!isFinite(seconds)) return "–:––";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ================================
   LOAD DATA
================================ */
async function loadData() {
  const sources = [
    "data/ringtones-c64.json",
    "data/ringtones-amiga.json",
    "data/ringtones-pc.json"
  ];

  const results = await Promise.all(
    sources.map((s) => fetch(s).then((r) => r.json()))
  );

  tracks = results.flat();
  render();
}

/* ================================
   FILTERS
================================ */
function setFilter(f) {
  currentFilter = f;
  document
    .querySelectorAll(".filters button[data-filter]")
    .forEach((b) => b.classList.toggle("active", b.dataset.filter === f));
  render();
}

function setTypeFilter(t) {
  currentTypeFilter = t;
  document
    .querySelectorAll(".filters-type button")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.typeFilter === t)
    );
  render();
}

/* ================================
   RENDER
================================ */
function render() {
  const container = document.getElementById("tracklist");
  container.innerHTML = "";
  renderIndex = 0;

  const q = norm(document.getElementById("search").value);

  currentFilteredTracks = tracks.filter((t) => {
    const matchesPlatform =
      currentFilter === "all" || norm(t.platform) === currentFilter;
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
      ...(t.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return matchesPlatform && matchesType && blob.includes(q);
  });

  document.getElementById(
    "results-info"
  ).textContent = `${currentFilteredTracks.length} tracks found`;

  renderNextChunk();
  setupObserver();
}

/* ================================
   CHUNKED RENDERING
================================ */
function renderNextChunk() {
  const container = document.getElementById("tracklist");

  currentFilteredTracks
    .slice(renderIndex, renderIndex + CHUNK_SIZE)
    .forEach((t) => container.appendChild(buildTrack(t)));

  renderIndex += CHUNK_SIZE;
}

/* ================================
   OBSERVER
================================ */
function setupObserver() {
  if (observer) observer.disconnect();

  const sentinel = document.createElement("div");
  sentinel.style.height = "1px";
  document.getElementById("tracklist").appendChild(sentinel);

  observer = new IntersectionObserver(
    (e) => {
      if (!e[0].isIntersecting) return;
      if (renderIndex >= currentFilteredTracks.length) return;
      renderNextChunk();
    },
    { rootMargin: "200px" }
  );

  observer.observe(sentinel);
}

/* ================================
   BUILD SONGBOX
================================ */
function buildTrack(t) {
  const card = document.createElement("div");
  card.className = "track";

  /* Title row */
  const titleRow = document.createElement("div");
  titleRow.className = "track-title";

  const title = document.createElement("div");
  title.className = "track-title-main";
  title.textContent = t.title;

  const meta = document.createElement("div");
  meta.className = "track-inline-meta";
  meta.style.color = getComputedStyle(title).color;

  if (t.category) meta.appendChild(inlineBox(t.category));
  meta.appendChild(inlineBox(t.platform));
  meta.appendChild(inlineBox(`v${t.variant}`));

  titleRow.append(title, meta);

  /* Line 2 */
  const line2 = document.createElement("div");
  line2.className = "track-line";
  line2.textContent = `${safe(t.production)} (${[t.publisher, t.year]
    .filter(Boolean)
    .join(", ")})`;

  /* Line 3 (sampling) */
  let line3 = null;
  if (t.sampling && t.sampling.title) {
    line3 = document.createElement("div");
    line3.className = "track-line";
    line3.textContent = `Sample: ${t.sampling.title} (${[t.sampling.artist, t.sampling.year]
      .filter(Boolean)
      .join(", ")})`;
  }

  /* Audio */
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "metadata";

  if (t.file_mp3) audio.innerHTML += `${t.file_mp3}`;
  if (t.file_m4r) audio.innerHTML += `${t.file_m4r}`;

  /* Actions */
  const actions = document.createElement("div");
  actions.className = "track-actions";

  const left = document.createElement("div");
  left.className = "actions-left";

  if (t.file_mp3) left.appendChild(dlBtn(t.file_mp3, "assets/android-favicon.png", "MP3"));
  if (t.file_m4r) left.appendChild(dlBtn(t.file_m4r, "assets/apple-favicon.png", "M4R"));

  const type = document.createElement("div");
  type.className = `track-type ${t.type.toLowerCase()}`;
  type.textContent = t.type;

  actions.append(left, type);

  card.append(titleRow, line2);
  if (line3) card.append(line3);
  card.append(audio, actions);

  return card;
}

/* ================================
   SMALL HELPERS
================================ */
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
  a.download = "";

  const img = document.createElement("img");
  img.src = icon;
  img.alt = label;

  a.append(img, label);
  return a;
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search").addEventListener("input", render);

  document
    .querySelectorAll(".filters button[data-filter]")
    .forEach((b) =>
      b.addEventListener("click", () => setFilter(b.dataset.filter))
    );

  document
    .querySelectorAll(".filters-type button")
    .forEach((b) =>
      b.addEventListener("click", () =>
        setTypeFilter(b.dataset.typeFilter)
      )
    );

  loadData();
});
