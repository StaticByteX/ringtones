let tracks = [];
let currentFilter = "all";
let currentTypeFilter = "all";
let current (v == null ? "" : String(v));let currentSortKey = "title";
const norm = v => safe(v).toLowerCase();

function platformColor(p) {
  if (p === "C64") return "#f2f540";
  if (p === "A500") return "#0094ff";
  if (p === "DOS") return "#ff66ff";
  if (p === "WIN") return "#66c656";
  return "#fff";
}

/* LOAD DATA */
async function loadData() {
  const files = [
    "data/ringtones-c64.json",
    "data/ringtones-amiga.json",
    "data/ringtones-dos.json",
    "data/ringtones-win.json"
  ];

  const data = await Promise.all(files.map(f => fetch(f).then(r => r.json())));
  tracks = data.flat();
  render();
}

/* FILTERS */
function setFilter(f) {
  currentFilter = f;
  document
    .querySelectorAll(".filters-platform button")
    .forEach(b => b.classList.toggle("active", b.dataset.filter === f));
  render();
}

function setTypeFilter(t) {
  currentTypeFilter = t;
  document
    .querySelectorAll(".filters-type button")
    .forEach(b => b.classList.toggle("active", b.dataset.typeFilter === t));
  render();
}

function setSort(k) {
  currentSortKey = k;
  document
    .querySelectorAll(".sort-buttons button")
    .forEach(b => b.classList.toggle("active", b.dataset.sort === k));
  render();
}

/* SORT VALUE */
function sortValue(t) {
  const c = t.composer || {};
  if (currentSortKey === "handle") return norm(c.handle);
  if (currentSortKey === "name") return norm(c.name);
  if (currentSortKey === "group") return norm(c.group);
  if (currentSortKey === "production") return norm(t.production);
  if (currentSortKey === "publisher") return norm(t.publisher);
  return norm(t.title);
}

/* RENDER */
function render() {
  const list = document.getElementById("tracklist");
  list.innerHTML = "";
  renderIndex = 0;

  const q = norm(document.getElementById("search").value);

  currentFilteredTracks = tracks.filter(t => {
    const platformOK =
      currentFilter === "all" || norm(t.platform) === currentFilter;
    const typeOK =
      currentTypeFilter === "all" || t.type === currentTypeFilter;

    const blob = [
      t.title,
      t.production,
      t.publisher,
      t.category,
      t.year,
      safe(t.composer?.handle),
      safe(t.composer?.name)
    ].join(" ").toLowerCase();

    return platformOK && typeOK && blob.includes(q);
  });

  currentFilteredTracks.sort((a, b) => {
    const av = sortValue(a);
    const bv = sortValue(b);
    return av.localeCompare(bv);
  });

  /* STATS */
  const composerSet = new Set();
  const productionSet = new Set();
  const publisherSet = new Set();
  const categorySet = new Set();

  currentFilteredTracks.forEach(t => {
    const h = safe(t.composer?.handle);
    const n = safe(t.composer?.name);
    if (h || n) composerSet.add(`${h}|${n}`);

    if (t.production) productionSet.add(t.production);
    if (t.publisher) publisherSet.add(t.publisher);
    if (t.category)
      t.category.split("|").forEach(c => categorySet.add(c.trim()));
  });

  const color =
    currentFilter === "c64" ? "#f2f540" :
    currentFilter === "a500" ? "#0094ff" :
    currentFilter === "dos" ? "#ff66ff" :
    currentFilter === "win" ? "#66c656" :
    "#ffffff";

  document.getElementById("results-info").innerHTML = `
    <span style="color:${color}">${currentFilteredTracks.length}</span> tracks •
    <span style="color:${color}">${composerSet.size}</span> composers •
    <span style="color:${color}">${productionSet.size}</span> productions •
    <span style="color:${color}">${publisherSet.size}</span> publishers •
    <span style="color:${color}">${categorySet.size}</span> categories
  `;

  renderChunk();
}

/* CHUNK */
function renderChunk() {
  const list = document.getElementById("tracklist");

  currentFilteredTracks
    .slice(renderIndex, renderIndex + CHUNK_SIZE)
    .forEach(t => list.appendChild(buildTrack(t)));

  renderIndex += CHUNK_SIZE;
}

/* BUILD TRACK */
function buildTrack(t) {
  const card = document.createElement("div");
  card.className = `track ${t.platform.toLowerCase()}`;

  /* LOGO */
  const logo = document.createElement("img");
  logo.className = "track-platform-logo";
  logo.src =
    t.platform === "C64" ? "assets/c64-logo.png" :
    t.platform === "A500" ? "assets/a500-logo.png" :
    t.platform === "DOS" ? "assets/dos-logo.png" :
    "assets/win-logo.png";
  card.appendChild(logo);

  /* TITLE */
  const titleRow = document.createElement("div");
  titleRow.className = "track-title";
  titleRow.style.color = platformColor(t.platform);

  titleRow.innerHTML = `
    <div class="track-title-main">${t.title}</div>
    <span class="inline-box">${safe(t.category).toUpperCase()}</span>
    <span class="inline-box">${t.platform}</span>
    <span class="inline-box">v${t.variant}</span>
  `;

  /* COMPOSER */
  const line2 = document.createElement("div");
  line2.className = "track-line";

  const c = t.composer || {};
  const hasSampling =
    t.sampling &&
    (t.sampling.title || t.sampling.artist || t.sampling.year);

  line2.textContent =
    c.handle && c.name ? `${c.handle} (${c.name})` :
    c.handle || c.name || "";

  /* PRODUCTION */
  const line3 = document.createElement("div");
  line3.className = "track-line";

  if (t.production || t.publisher) {
    const bits = [];
    if (t.publisher) bits.push(t.publisher);
    if (t.year) bits.push(t.year);
    line3.textContent =
      `${safe(t.production)}${bits.length ? ` (${bits.join(", ")})` : ""}`;
  } else if (t.year) {
    line3.textContent = t.year;
  }

  /* SAMPLING */
  let line4 = null;
  if (hasSampling) {
    line4 = document.createElement("div");
    line4.className = "track-line";
    const s = t.sampling;
    const inner = [s.artist, s.year].filter(Boolean).join(", ");
    line4.textContent =
      `Contains elements from: ${s.title}${inner ? ` (${inner})` : ""}`;
  }

  /* AUDIO */
  const audio = document.createElement("audio");
  audio.controls = true;

  if (!isIOS && t.file_mp3) {
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

  card.append(titleRow, line2, line3);
  if (line4) card.append(line4);
  card.append(audio);

  return card;
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search").addEventListener("input", render);
  document.getElementById("search-clear").addEventListener("click", () => {
    document.getElementById("search").value = "";
    render();
  });

  document
    .querySelectorAll(".filters-platform button")
    .forEach(b =>
      b.addEventListener("click", () => setFilter(b.dataset.filter))
    );

  document
    .querySelectorAll(".filters-type button")
    .forEach(b =>
      b.addEventListener("click", () =>
        setTypeFilter(b.dataset.typeFilter))
    );

  document
    .querySelectorAll(".sort-buttons button")
    .forEach(b =>
      b.addEventListener("click", () => setSort(b.dataset.sort))
    );

  loadData();
});
``

const CHUNK_SIZE = 50;
let renderIndex = 0;
let currentFilteredTracks = [];

const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);

