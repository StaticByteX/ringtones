let tracks = [];
let currentFilter = "all";
let currentTypeFilter = "all";

/* Simple device detection */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

/* Helpers */
const safeText = (v) => (v === null || v === undefined ? "" : String(v));
const normalize = (s) => safeText(s).toLowerCase();

function platformToKey(platform) {
  return normalize(platform);
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
      container.textContent = "";
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

  document.querySelectorAll(".filters button").forEach((btn) => {
    btn.classList.remove("active");
  });

  const activeBtn = document.querySelector(`.filters button[data-filter="${filter}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  render();
}

/* TYPE FILTER */
function setTypeFilter(typeFilter) {
  currentTypeFilter = typeFilter;

  document.querySelectorAll(".filters-type button").forEach((btn) => {
    btn.classList.remove("active");
  });

  const activeBtn = document.querySelector(`.filters-type button[data-type-filter="${typeFilter}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  render();
}

/* TOOLTIP (per-button, auto-hide, fade in/out) */
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

  if (kind === "ios") {
    line1.textContent = "🍏 iPhone tip:";
    line2.textContent = "Open in GarageBand → Share → Ringtone → Use as ringtone";
  } else {
    line1.textContent = "⬇️ Android tip:";
    line2.textContent = "Open the file → Set as ringtone";
  }

  text.appendChild(line1);
  text.appendChild(line2);

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

/* RENDER */
function render() {
  const container = document.getElementById("tracklist");
  if (!container) return;

  const searchInput = document.getElementById("search");
  const query = normalize(searchInput ? searchInput.value : "");

  container.textContent = "";

  const filtered = tracks.filter((t) => {
    const platformKey = platformToKey(t.platform);
    const matchesPlatform = currentFilter === "all" || platformKey === currentFilter;

    const matchesType =
      currentTypeFilter === "all" || safeText(t.type) === currentTypeFilter;

    const searchable = [
      safeText(t.title),
      safeText(t.composer && t.composer.handle),
      safeText(t.composer && t.composer.name),
      safeText(t.composer && t.composer.group),
      safeText(t.production),
      safeText(t.year),
      safeText(t.publisher),
      safeText(t.sampling && t.sampling.title),
      safeText(t.sampling && t.sampling.artist),
      safeText(t.sampling && t.sampling.year),
      safeText(t.type)
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchable.includes(query);

    return matchesPlatform && matchesType && matchesSearch;
  });

  /* Sort: title (alpha), then variant (numeric asc) */
  filtered.sort((a, b) => {
    const ta = normalize(a.title);
    const tb = normalize(b.title);
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    const va = Number(a.variant) || 0;
    const vb = Number(b.variant) || 0;
    return va - vb;
  });

  /* Results info (bigger, bold count, line breaks before/after) */
  const resultsInfo = document.getElementById("results-info");
  if (resultsInfo) {
    const count = filtered.length;
    const trackWord = count === 1 ? "track" : "tracks";

    let filterLabel = "All";
    if (currentFilter === "c64") filterLabel = "C64";
    else if (currentFilter === "a500") filterLabel = "Amiga";
    else if (currentFilter === "pc") filterLabel = "PC";

    let typeLabel = "all types";
    if (currentTypeFilter === "Ringtone") typeLabel = "ringtones";
    else if (currentTypeFilter === "Notification") typeLabel = "notifications";

    resultsInfo.innerHTML = `<br><strong>${count} ${trackWord} found</strong> (filter: ${filterLabel}, ${typeLabel})<br>`;
  }

  /* iOS hint */
  const iosHint = document.getElementById("ios-hint");
  if (iosHint) {
    iosHint.textContent = isIOS
      ? 'On iPhone: Use the "M4R (iPhone)" download, then open it in GarageBand to install the ringtone.'
      : "";
  }

  /* Build cards */
  const audios = [];

  filtered.forEach((track) => {
    const card = document.createElement("div");
    const platformKey = platformToKey(track.platform);
    card.className = `track ${platformKey}`;

    /* Title row */
    const titleRow = document.createElement("div");
    titleRow.className = "track-title";

    const titleMain = document.createElement("div");
    titleMain.className = "track-title-main";
    titleMain.textContent = safeText(track.title);

    const titleSub = document.createElement("div");
    titleSub.className = "track-title-sub";
    titleSub.textContent = `${safeText(track.platform)} • ${safeText(track.variant)}`;

    titleRow.appendChild(titleMain);
    titleRow.appendChild(titleSub);

    /* Type badge (Segoe UI + CAPITAL letters) */
    if (track.type) {
      const typeBadge = document.createElement("span");
      const type = safeText(track.type);

      let icon = "";
      let cls = "";
      let label = "";

      if (type === "Ringtone") {
        icon = "🔔";
        cls = "ringtone";
        label = "RINGTONE";
      } else if (type === "Notification") {
        icon = "✉️";
        cls = "notification";
        label = "NOTIFICATION";
      } else {
        label = type.toUpperCase();
      }

      typeBadge.className = `track-type ${cls}`;
      typeBadge.textContent = `${icon} ${label}`.trim();
      titleRow.appendChild(typeBadge);
    }

    /* Meta line: composer + category */
    const meta = document.createElement("div");
    meta.className = "track-meta";

    const comp = track.composer || { handle: "", name: "", group: "" };
    const handle = safeText(comp.handle);
    const name = safeText(comp.name);
    const group = safeText(comp.group);

    let composerLine = "";
    if (handle && name) composerLine = `${handle} (${name})`;
    else if (handle) composerLine = handle;
    else if (name) composerLine = name;

    if (group) composerLine = composerLine ? `${composerLine} – ${group}` : group;

    meta.textContent = composerLine;

    if (track.category) {
      const cat = document.createElement("span");
      cat.className = "track-category";
      cat.textContent = `[${safeText(track.category)}]`;
      meta.appendChild(cat);
    }

    /* Audio playbar (prefer MP3; fallback M4R) */
    const audioSrc = safeText(track.file_mp3) || safeText(track.file_m4r);
    let audioEl = null;
    if (audioSrc) {
      audioEl = document.createElement("audio");
      audioEl.controls = true;
      audioEl.preload = "none";
      audioEl.src = audioSrc;
      audios.push(audioEl);
    }

    /* Download buttons (device logic per master prompt) */
    const actions = document.createElement("div");
    actions.className = "track-actions";

    const hasMp3 = !!safeText(track.file_mp3);
    const hasM4r = !!safeText(track.file_m4r);

    /* Android/Desktop: show MP3 + M4R */
    if (hasMp3 && !isIOS) {
      const a = document.createElement("a");
      a.className = "download-btn";
      a.href = safeText(track.file_mp3);
      a.setAttribute("download", "");
      a.dataset.tip = "android";
      a.textContent = "⬇️ MP3";
      a.addEventListener("click", () => showTooltip(a, "android"));
      actions.appendChild(a);
    }

    /* iOS: hide MP3 button, show M4R (still also show M4R on non-iOS) */
    if (hasM4r) {
      const a = document.createElement("a");
      a.className = "download-btn";
      a.href = safeText(track.file_m4r);
      a.setAttribute("download", "");
      a.dataset.tip = "ios";
      a.textContent = isIOS ? "🍏 M4R (iPhone)" : "🍏 M4R";
      a.addEventListener("click", () => showTooltip(a, "ios"));
      actions.appendChild(a);
    }

    /* More toggle + extra */
    const toggle = document.createElement("button");
    toggle.className = "track-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "More ▾";

    const extra = document.createElement("div");
    extra.className = "track-extra";
    extra.setAttribute("aria-hidden", "true");

    /* Extra: production / publisher / year (null-safe) */
    const prod = safeText(track.production);
    const pub = safeText(track.publisher);
    const year = safeText(track.year);

    const metaBits = [];
    if (pub) metaBits.push(pub);
    if (year) metaBits.push(year);

    let extraMain = "";
    if (prod && metaBits.length) extraMain = `${prod} (${metaBits.join(", ")})`;
    else if (prod) extraMain = prod;
    else if (metaBits.length) extraMain = metaBits.join(", ");

    if (extraMain) {
      const line = document.createElement("div");
      line.textContent = extraMain;
      extra.appendChild(line);
    }

    /* Sampling (null-safe) */
    if (track.sampling) {
      const s = track.sampling;
      const sTitle = safeText(s.title);
      const sArtist = safeText(s.artist);
      const sYear = safeText(s.year);

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
      toggle.textContent = isOpen ? "More ▴" : "More ▾";
      toggle.setAttribute("aria-expanded", String(isOpen));
      extra.setAttribute("aria-hidden", String(!isOpen));
    });

    /* Assemble */
    card.appendChild(titleRow);
    card.appendChild(meta);
    if (audioEl) card.appendChild(audioEl);
    if (actions.childElementCount > 0) card.appendChild(actions);
    card.appendChild(toggle);
    card.appendChild(extra);

    container.appendChild(card);
  });

  /* Only one audio plays at a time */
  audios.forEach((audio) => {
    audio.addEventListener("play", () => {
      audios.forEach((a) => {
        if (a !== audio) a.pause();
      });
    });
  });
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", () => render());
  }

  document.querySelectorAll(".filters button").forEach((btn) => {
    const filter = btn.getAttribute("data-filter");
    if (!filter) return;
    btn.addEventListener("click", () => setFilter(filter));
  });

  document.querySelectorAll(".filters-type button").forEach((btn) => {
    const typeFilter = btn.getAttribute("data-type-filter");
    if (!typeFilter) return;
    btn.addEventListener("click", () => setTypeFilter(typeFilter));
  });

  loadData();
});
