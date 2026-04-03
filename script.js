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

function platformColor(platform) {
  if (platform === "C64") return "#f2f540";
  if (platform === "A500") return "#0094ff";
  if (platform === "DOS") return "#ff66ff";
  if (platform === "WIN") return "#66c656";
  return "#ffffff";
}

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
    case "title": return norm(track.title);
    case "handle": return norm(c.handle);
    case "name": return norm(c.name);
    case "group": return norm(c.group);
    case "production": return norm(track.production);
    case "publisher": return norm(track.publisher);
    default: return norm(track.title);
  }
}

function render() {
  const container = document.getElementById("tracklist");
  container.innerHTML = "";
  renderIndex = 0;

  const q = norm(document.getElementById("search").value);
  document
    .getElementById("search-clear")
    .classList.toggle("hidden", !q);

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
      safe(t.composer?.handle),
      safe(t.composer?.name),
      safe(t.composer?.group)
    ].join(" ").toLowerCase();

    return matchesPlatform && matchesType && blob.includes(q);
  });

  currentFilteredTracks.sort((a, b) =>
    sortValue(a).localeCompare(sortValue(b))
  );

  const composerSet = new Set();
  const productionSet = new Set();
  const publisherSet = new Set();

  currentFilteredTracks.forEach((t) => {
    const h = safe(t.composer?.handle);
    const n = safe(t.composer?.name);
    if (h || n) composerSet.add(`${h}|${n}`);
    if (t.production) productionSet.add(t.production);
    if (t.publisher) publisherSet.add(t.publisher);
  });

  const accentColor =
    currentFilter === "c64" ? "#f2f540" :
    currentFilter === "a500" ? "#0094ff" :
    currentFilter === "dos" ? "#ff66ff" :
    currentFilter === "win" ? "#66c656" :
    "#ffffff";

  document.getElementById("results-info").innerHTML = `
    <span style="color:${accentColor}">${currentFilteredTracks.length}</span> tracks •
    <span style="color:${accentColor}">${composerSet.size}</span> composers •
    <span style="color:${accentColor}">${productionSet.size}</span> productions •
    <span style="color:${accentColor}">${publisherSet.size}</span> publishers
  `;

  renderNextChunk();
  setupObserver();
}

function renderNextChunk() {
  const container = document.getElementById("tracklist");

  currentFilteredTracks
    .slice(renderIndex, renderIndex + CHUNK_SIZE)
    .forEach((t) => container.appendChild(buildTrack(t)));

  renderIndex += CHUNK_SIZE;
}

function setupObserver() {
  if (observer) observer.disconnect();

  const sentinel = document.createElement("div");
  sentinel.style.height = "1px";
  document.getElementById("tracklist").appendChild(sentinel);

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

function buildTrack(t) {
  const card = document.createElement("div");
  card.className = `track ${norm(t.platform)}`;

  const logo = document.createElement("img");
  logo.className = "track-platform-logo";
  logo.src =
    t.platform === "C64" ? "assets/c64-logo.png" :
    t.platform === "A500" ? "assets/a500-logo.png" :
    t.platform === "DOS" ? "assets/dos-logo.png" :
    "assets/win-logo.png";
  logo.alt = `${t.platform} logo`;
  card.appendChild(logo);

  const titleRow = document.createElement("div");
  titleRow.className = "track-title";
  titleRow.style.color = platformColor(t.platform);

  const title = document.createElement("div");
  title.className = "track-title-main";
  title.textContent = t.title;

  const meta = document.createElement("div");
  meta.className = "track-inline-meta";
  if (t.category) meta.appendChild(inlineBox(t.category.toUpperCase()));
  meta.appendChild(inlineBox(t.platform));
  meta.appendChild(inlineBox(`v${t.variant}`));

  titleRow.append(title, meta);

  const comp = t.composer || {};
  const hasSampling =
    t.sampling &&
    (t.sampling.title || t.sampling.artist || t.sampling.year);

  const composerLine = document.createElement("div");
  composerLine.className = "track-line";

  let composerText =
    comp.handle && comp.name ? `${comp.handle} (${comp.name})` :
    comp.handle || comp.name || "";

  if (!hasSampling && t.year) composerText += `, ${t.year}`;
  composerLine.textContent = composerText;

  const prodLine = document.createElement("div");
  prodLine.className = "track-line";
  if (t.production || t.publisher) {
    const bits = [];
    if (t.publisher) bits.push(t.publisher);
    if (t.year) bits.push(t.year);
    prodLine.textContent =
      t.production
        ? `${t.production}${bits.length ? ` (${bits.join(", ")})` : ""}`
        : bits.join(", ");
  }

  let sampleLine = null;
  if (hasSampling) {
    sampleLine = document.createElement("div");
    sampleLine.className = "track-line";
    const inner = [t.sampling.artist, t.sampling.year]
      .filter(Boolean)
      .join(", ");
    sampleLine.textContent =
      `Contains elements from: ${t.sampling.title}${inner ? ` (${inner})` : ""}`;
  }

  const audio = document.createElement("audio");
  audio.controls = true;

  if (t.file_mp3 && !isIOS) {
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

  audio.addEventListener("play", () => {
    document.querySelectorAll("#tracklist audio").forEach((a) => {
      if (a !== audio) a.pause();
    });
  });

  const actions = document.createElement("div");
  actions.className = "track-actions";

  const left = document.createElement("div");
  left.className = "actions-left";
  if (t.file_mp3 && !isIOS) left.appendChild(dlBtn(t.file_mp3, "assets/android-favicon.png", "MP3"));
  if (t.file_m4r) left.appendChild(dlBtn(t.file_m4r, "assets/apple-favicon.png", "M4R"));

  const type = document.createElement("div");
  type.className = `track-type ${t.type.toLowerCase()}`;
  type.textContent = t.type;

  actions.append(left, type);

  card.append(titleRow, composerLine);
  if (prodLine.textContent) card.append(prodLine);
  if (sampleLine) card.append(sampleLine);
  card.append(audio, actions);

  return card;
}

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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search").addEventListener("input", render);
  document.getElementById("search-clear").addEventListener("click", () => {
    document.getElementById("search").value = "";
    render();
  });

  document
    .querySelectorAll(".filters-platform button")
    .forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter)));

  document
    .querySelectorAll(".filters-type button")
    .forEach((b) => b.addEventListener("click", () => setTypeFilter(b.dataset.typeFilter)));

  document
    .querySelectorAll(".sort-buttons button")
    .forEach((b) => b.addEventListener("click", () => setSort(b.dataset.sort)));

  loadData();
});
