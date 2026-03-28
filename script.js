let tracks = [];
let currentFilter = "all";
let currentTypeFilter = "all";

const CHUNK_SIZE = 50;
let renderIndex = 0;
let currentFilteredTracks = [];
let lazyObserver = null;

/* Device logic */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

/* Helpers */
function safeText(v) {
  return v === null || v === undefined ? "" : String(v);
}

function normalize(v) {
  return safeText(v).toLowerCase();
}

function platformToKey(platform) {
  return normalize(platform);
}

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return "–:––";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* LOAD JSON */
async function loadData() {
  const sources = [
    "data/ringtones-c64.json",
    "data/ringtones-amiga.json",
    "data/ringtones-pc.json"
  ];

  try {
    const results = await Promise.all(
      sources.map((src) => fetch(src).then((res) => res.json()))
    );

    tracks = results.flat();
    render();
  } catch (err) {
    console.error("Error loading data:", err);
    const container = document.getElementById("tracklist");
    if (container) {
      container.innerHTML = "";
      const p = document.createElement("p");
      p.className = "error";
      p.textContent = "Failed to load tracks. Please try again later.";
      container.appendChild(p);
    }
  }
}

/* PLATFORM FILTER */
function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filters button[data-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === filter);
  });

  render();
}

/* TYPE FILTER */
function setTypeFilter(typeFilter) {
  currentTypeFilter = typeFilter;

  document.querySelectorAll(".filters-type button[data-type-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-type-filter") === typeFilter);
  });

  render();
}

/* RESULTS INFO + iOS HINT */
function updateStatus(count) {
  const resultsInfo = document.getElementById("results-info");
  if (resultsInfo) {
    const word = count === 1 ? "track" : "tracks";

    let platformLabel = "All";
    if (currentFilter === "c64") platformLabel = "C64";
    else if (currentFilter === "a500") platformLabel = "Amiga";
    else if (currentFilter === "pc") platformLabel = "PC";

    let typeLabel = "all types";
    if (currentTypeFilter === "Ringtone") typeLabel = "ringtones";
    else if (currentTypeFilter === "Notification") typeLabel = "notifications";

    resultsInfo.textContent = `${count} ${word} found (filter: ${platformLabel}, ${typeLabel})`;
  }

  const iosHint = document.getElementById("ios-hint");
  if (iosHint) {
    iosHint.textContent = isIOS
      ? 'On iPhone: Use the "🍏 M4R" download, then open in GarageBand to install the ringtone.'
      : "";
  }
}

/* TOOLTIP (per-button, auto-hide, fade in/out, non-blocking layout) */
function showTooltip(anchor, kind) {
  const actions = anchor.closest(".track-actions");
  if (!actions) return;

  actions.querySelectorAll(".tooltip").forEach((t) => t.remove());

  const tip = document.createElement("div");
  tip.className = "tooltip";

  const text = document.createElement("div");
  text.className = "tooltip-text";

  const line1 = document.createElement("div");
  const line2 = document.createElement("div");
  const line3 = document.createElement("div");

  if (kind === "ios") {
    line1.textContent = "🍏 iPhone tip:";
    line2.textContent = "Open in GarageBand → Share → Ringtone → Use as ringtone";
    line3.textContent = "";
  } else {
    line1.textContent = "⬇️ Android tip:";
    line2.textContent = "Open the file → Set as ringtone";
    line3.textContent = "";
  }

  text.appendChild(line1);
  text.appendChild(line2);
  if (line3.textContent) text.appendChild(line3);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "tooltip-close";
  close.textContent = "Got it";

  tip.appendChild(text);
  tip.appendChild(close);
  actions.appendChild(tip);

  requestAnimationFrame(() => tip.classList.add("visible"));

  const hide = () => {
    tip.classList.remove("visible");
    window.setTimeout(() => tip.remove(), 220);
  };

  const timer = window.setTimeout(hide, 4000);

  close.addEventListener("click", () => {
    window.clearTimeout(timer);
    hide();
  });
}

/* BUILD TRACK CARD */
function buildTrackCard(track) {
  const card = document.createElement("div");
  card.className = `track ${platformToKey(track.platform)}`;

  const titleRow = document.createElement("div");
  titleRow.className = "track-title";

  const titleMain = document.createElement("div");
  titleMain.className = "track-title-main";
  titleMain.textContent = safeText(track.title) || "Untitled";

  const titleSub = document.createElement("div");
  titleSub.className = "track-title-sub";
  titleSub.textContent = `${safeText(track.platform)} • ${safeText(track.variant)}`;

  titleRow.appendChild(titleMain);
  titleRow.appendChild(titleSub);

  /* Type badge */
  const typeRaw = safeText(track.type);
  if (typeRaw) {
    const badge = document.createElement("span");
    badge.className = "track-type";

    let icon = "";
    let cls = "";
    if (typeRaw === "Ringtone") {
      icon = "🔔";
      cls = "ringtone";
    } else if (typeRaw === "Notification") {
      icon = "✉️";
      cls = "notification";
    }
    badge.classList.add(cls);
    badge.textContent = `${icon} ${typeRaw}`.trim();
    titleRow.appendChild(badge);
  }

  /* Composer line (null-safe, never prints (null)) */
  const comp = track.composer || { handle: null, name: null, group: null };
  const handle = safeText(comp.handle).trim();
  const name = safeText(comp.name).trim();
  const group = safeText(comp.group).trim();

  let composerLine = "";
  if (handle && name) composerLine = `${handle} (${name})`;
  else if (handle) composerLine = handle;
  else if (name) composerLine = name;

  if (group) composerLine = composerLine ? `${composerLine} – ${group}` : group;

  const meta = document.createElement("div");
  meta.className = "track-meta";
  meta.textContent = composerLine;

  if (track.category) {
    const cat = document.createElement("span");
    cat.className = "track-category";
    cat.textContent = `[${safeText(track.category)}]`;
    meta.appendChild(cat);
  }

  /* Audio (Option B: preload metadata + duration) */
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "metadata";

  const mp3Url = safeText(track.file_mp3).trim();
  const m4rUrl = safeText(track.file_m4r).trim();

  if (mp3Url) {
    const s = document.createElement("source");
    s.src = mp3Url;
    s.type = "audio/mpeg";
    audio.appendChild(s);
  }
  if (m4rUrl) {
    const s = document.createElement("source");
    s.src = m4rUrl;
    s.type = "audio/mp4";
    audio.appendChild(s);
  }

  const durationLabel = document.createElement("div");
  durationLabel.className = "track-duration";
  durationLabel.textContent = "Length: –:––";

  audio.addEventListener("loadedmetadata", () => {
    durationLabel.textContent = `Length: ${formatDuration(audio.duration)}`;
  });

  /* Only one audio plays at a time */
  audio.addEventListener("play", () => {
    document.querySelectorAll("#tracklist audio").forEach((a) => {
      if (a !== audio) a.pause();
    });
  });

  /* Downloads + tooltips */
  const actions = document.createElement("div");
  actions.className = "track-actions";

  if (!isIOS && mp3Url) {
    const a = document.createElement("a");
    a.className = "download-btn";
    a.href = mp3Url;
    a.setAttribute("download", "");
    a.textContent = "⬇️ MP3";
    a.addEventListener("click", () => showTooltip(a, "android"));
    actions.appendChild(a);
  }

  if (m4rUrl) {
    const a = document.createElement("a");
    a.className = "download-btn";
    a.href = m4rUrl;
    a.setAttribute("download", "");
    a.textContent = "🍏 M4R";
    a.addEventListener("click", () => showTooltip(a, "ios"));
    actions.appendChild(a);
  }

  /* More toggle + extra (null-safe) */
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "track-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "MORE ▾";

  const extra = document.createElement("div");
  extra.className = "track-extra";
  extra.setAttribute("aria-hidden", "true");

  const prod = safeText(track.production).trim();
  const pub = safeText(track.publisher).trim();
  const year = track.year === null || track.year === undefined ? "" : String(track.year);

  const bits = [];
  if (pub) bits.push(pub);
  if (year) bits.push(year);

  let extraMain = "";
  if (prod && bits.length) extraMain = `${prod} (${bits.join(", ")})`;
  else if (prod) extraMain = prod;
  else if (bits.length) extraMain = bits.join(", ");

  if (extraMain) {
    const line = document.createElement("div");
    line.textContent = extraMain;
    extra.appendChild(line);
  }

  if (track.sampling) {
    const s = track.sampling;
    const sTitle = safeText(s.title).trim();
    const sArtist = safeText(s.artist).trim();
    const sYear = s.year === null || s.year === undefined ? "" : String(s.year);

    if (sTitle) {
      const parts = [];
      if (sArtist) parts.push(sArtist);
      if (sYear) parts.push(sYear);

      const line = document.createElement("div");
      line.textContent = parts.length
        ? `Sample: ${sTitle} (${parts.join(", ")})`
        : `Sample: ${sTitle}`;
      extra.appendChild(line);
    }
  }

  toggle.addEventListener("click", () => {
    const isOpen = card.classList.toggle("open");
    toggle.textContent = isOpen ? "MORE ▴" : "MORE ▾";
    toggle.setAttribute("aria-expanded", String(isOpen));
    extra.setAttribute("aria-hidden", String(!isOpen));
  });

  /* Assemble */
  card.appendChild(titleRow);
  card.appendChild(meta);
  card.appendChild(audio);
  card.appendChild(durationLabel);

  if (actions.childElementCount > 0) {
    card.appendChild(actions);
  }

  card.appendChild(toggle);
  card.appendChild(extra);

  return card;
}

/* LAZY RENDERING */
function renderNextChunk() {
  const container = document.getElementById("tracklist");
  if (!container) return;

  const slice = currentFilteredTracks.slice(renderIndex, renderIndex + CHUNK_SIZE);
  slice.forEach((track) => container.appendChild(buildTrackCard(track)));
  renderIndex += CHUNK_SIZE;
}

function setupLazyObserver() {
  if (lazyObserver) {
    lazyObserver.disconnect();
    lazyObserver = null;
  }

  const container = document.getElementById("tracklist");
  if (!container) return;

  let sentinel = document.getElementById("scroll-sentinel");
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "scroll-sentinel";
  }

  container.appendChild(sentinel);

  lazyObserver = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;

      if (renderIndex >= currentFilteredTracks.length) {
        lazyObserver.disconnect();
        return;
      }

      renderNextChunk();
    },
    { rootMargin: "200px" }
  );

  lazyObserver.observe(sentinel);
}

/* RENDER (filter + sort + first chunk) */
function render() {
  const container = document.getElementById("tracklist");
  if (!container) return;

  renderIndex = 0;
  container.innerHTML = "";

  const query = normalize(document.getElementById("search")?.value || "");

  currentFilteredTracks = tracks
    .filter((t) => {
      const platformKey = platformToKey(t.platform);
      const matchesPlatform = currentFilter === "all" || platformKey === currentFilter;

      const matchesType =
        currentTypeFilter === "all" || safeText(t.type) === currentTypeFilter;

      const searchable = [
        safeText(t.title),
        safeText(t.platform),
        safeText(t.variant),
        safeText(t.type),
        safeText(t.category),
        safeText(t.production),
        safeText(t.publisher),
        safeText(t.year),
        safeText(t.composer && t.composer.handle),
        safeText(t.composer && t.composer.name),
        safeText(t.composer && t.composer.group),
        safeText(t.sampling && t.sampling.title),
        safeText(t.sampling && t.sampling.artist),
        safeText(t.sampling && t.sampling.year),
        Array.isArray(t.tags) ? t.tags.join(" ") : ""
      ]
        .join(" ")
        .toLowerCase();

      return matchesPlatform && matchesType && searchable.includes(query);
    })
    .sort((a, b) => {
      const ta = normalize(a.title);
      const tb = normalize(b.title);
      if (ta < tb) return -1;
      if (ta > tb) return 1;

      const va = Number(a.variant) || 0;
      const vb = Number(b.variant) || 0;
      return va - vb;
    });

  updateStatus(currentFilteredTracks.length);

  renderNextChunk();
  setupLazyObserver();
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", render);
  }

  document.querySelectorAll('.filters button[data-filter]').forEach((btn) => {
    const filter = btn.getAttribute("data-filter");
    btn.addEventListener("click", () => setFilter(filter));
  });

  document.querySelectorAll('.filters-type button[data-type-filter]').forEach((btn) => {
    const typeFilter = btn.getAttribute("data-type-filter");
    btn.addEventListener("click", () => setTypeFilter(typeFilter));
  });

  loadData();
});
