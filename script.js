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
  return "#ff66ff";
}

/* LOAD DATA */
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
    .querySelectorAll(".filters-type button")
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

/* RENDER */
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
      safe(t.composer?.handle),
      safe(t.composer?.name),
      safe(t.composer?.group),
      ...(t.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return matchesPlatform && matchesType && blob.includes(q);
  });

  /* SORT ACCORDING TO CURRENT SORT KEY */
  currentFilteredTracks.sort((a, b) => {
    const av = sortValue(a);
    const bv = sortValue(b);
    if (av < bv) return -1;
    if (av > bv) return 1;
    /* tie-breaker by title */
    const at = norm(a.title);
    const bt = norm(b.title);
    if (at < bt) return -1;
    if (at > bt) return 1;
    return 0;
  });

  document.getElementById("results-info").textContent =
    `${currentFilteredTracks.length} tracks found`;

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

/* OBSERVER FOR LAZY LOAD */
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

  const card = document.createElement("div");
  card.className = "track";

  /* LINE 1: TITLE + INLINE META */
  const titleRow = document.createElement("div");
  titleRow.className = "track-title";
  titleRow.style.color = color;

  const title = document.createElement("div");
  title.className = "track-title-main";
  title.textContent = t.title;

  const meta = document.createElement("div");
  meta.className = "track-inline-meta";

  if (t.category) meta.appendChild(inlineBox(t.category));
  meta.appendChild(inlineBox(t.platform));
  meta.appendChild(inlineBox(`v${t.variant}`));

  titleRow.append(title, meta);

  /* LINE 2: COMPOSER */
  const line2 = document.createElement("div");
  line2.className = "track-line";

  const comp = t.composer || {};
  const handle = safe(comp.handle);
  const name = safe(comp.name);
  const group = safe(comp.group);

  if (handle && name && group) {
    line2.textContent = `${handle} (${name}) – ${group}`;
  } else if (handle && name && !group) {
    line2.textContent = `${handle} (${name})`;
  } else if (!handle && name && group) {
    line2.textContent = `${name} – ${group}`;
  } else if (!handle && name && !group) {
    line2.textContent = name;
  } else if (handle && !name && group) {
    line2.textContent = `${handle} – ${group}`;
  } else if (handle && !name && !group) {
    line2.textContent = handle;
  } else if (!handle && !name && group) {
    line2.textContent = group;
  } else {
    line2.textContent = "";
  }

  /* LINE 3: PRODUCTION (publisher, year) */
  const line3 = document.createElement("div");
  line3.className = "track-line";
  line3.textContent =
    `${safe(t.production)} (${safe(t.publisher)}, ${safe(t.year)})`;

  /* LINE 4: SAMPLING (optional) */
  let line4 = null;
  if (
    t.sampling &&
    (t.sampling.title || t.sampling.artist || t.sampling.year)
  ) {
    line4 = document.createElement("div");
    line4.className = "track-line";
    line4.textContent =
      `Contains elements from ${safe(t.sampling.title)} (${safe(t.sampling.artist)}, ${safe(t.sampling.year)})`;
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

  /* On iOS, hide MP3 button entirely */
  if (!isIOS && t.file_mp3) {
    left.appendChild(
      dlBtn(t.file_mp3, "assets/android-favicon.png", "MP3")
    );
  }
  if (t.file_m4r) {
    left.appendChild(
      dlBtn(t.file_m4r, "assets/apple-favicon.png", "M4R")
    );
  }

  const type = document.createElement("div");
  type.className = `track-type ${t.type.toLowerCase()}`;
  type.textContent = t.type;

  actions.append(left, type);

  /* ASSEMBLE CARD */
  card.append(titleRow, line2, line3);
  if (line4) card.append(line4);
  card.append(audio, actions);

  return card;
}

/* SMALL HELPERS */
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

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("search")
    .addEventListener("input", render);

  document
    .querySelectorAll(".filters-platform button[data-filter]")
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

  document
    .querySelectorAll(".sort-buttons button[data-sort]")
    .forEach((b) =>
      b.addEventListener("click", () => setSort(b.dataset.sort))
    );

  loadData();
});
