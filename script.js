let tracks = [];
let currentFilter = "all";
let currentTypeFilter = "all";

const safe = v => v ?? "";

/* LOAD JSON */
async function loadData() {
  const sources = [
    "data/ringtones-c64.json",
    "data/ringtones-amiga.json",
    "data/ringtones-pc.json"
  ];

  try {
    const results = await Promise.all(
      sources.map(src => fetch(src).then(res => res.json()))
    );

    tracks = results.flat();
    render();
  } catch (err) {
    console.error("Error loading data:", err);
    const container = document.getElementById("tracklist");
    container.innerHTML = `<p style="color:#f66;">Failed to load tracks. Please try again later.</p>`;
  }
}

/* PLATFORM FILTER */
function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filters button").forEach(btn => {
    btn.classList.remove("active");
  });

  const activeBtn = document.querySelector(`.filters button[data-filter="${filter}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  render();
}

/* TYPE FILTER */
function setTypeFilter(typeFilter) {
  currentTypeFilter = typeFilter;

  document.querySelectorAll(".filters-type button").forEach(btn => {
    btn.classList.remove("active");
  });

  const activeBtn = document.querySelector(`.filters-type button[data-type-filter="${typeFilter}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  render();
}

/* RENDER */
function render() {
  const container = document.getElementById("tracklist");
  const searchInput = document.getElementById("search");
  const query = (searchInput?.value || "").toLowerCase();

  container.innerHTML = "";

  const filtered = tracks.filter(t => {
    const matchesPlatform =
      currentFilter === "all" || t.platform.toLowerCase() === currentFilter;

    const matchesType =
      currentTypeFilter === "all" || (t.type && t.type === currentTypeFilter);

    const searchableText = `
      ${safe(t.title)}
      ${safe(t.composer?.handle)}
      ${safe(t.composer?.name)}
      ${safe(t.composer?.group)}
      ${safe(t.production)}
      ${safe(t.year)}
      ${safe(t.publisher)}
      ${safe(t.sampling?.title)}
      ${safe(t.sampling?.artist)}
      ${safe(t.sampling?.year)}
      ${safe(t.type)}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(query);

    return matchesPlatform && matchesType && matchesSearch;
  });

  // Sort alphabetically by title, then variant
  filtered.sort((a, b) => {
    const titleA = (a.title || "").toLowerCase();
    const titleB = (b.title || "").toLowerCase();

    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;

    const varA = Number(a.variant) || 0;
    const varB = Number(b.variant) || 0;
    return varA - varB;
  });

  // Result info text
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

    resultsInfo.textContent = `${count} ${trackWord} found (filter: ${filterLabel}, ${typeLabel})`;
  }

  filtered.forEach(track => {
    const div = document.createElement("div");
    div.className = `track ${track.platform.toLowerCase()}`;

    // ==== Composer logic (null-safe, no "(null)") ====
    let composerLine = "";
    const comp = track.composer || {};
    const handle = comp.handle || "";
    const name = comp.name || "";
    const group = comp.group || "";

    if (handle && name) {
      composerLine = `${handle} (${name})`;
    } else if (handle && !name) {
      composerLine = handle;
    } else if (!handle && name) {
      composerLine = name;
    } else {
      composerLine = "";
    }

    if (group) {
      composerLine = composerLine ? `${composerLine} – ${group}` : group;
    }

    // ==== Sampling (null-safe) ====
    let sampling = "";
    if (track.sampling) {
      const s = track.sampling;
      const sTitle = s.title || "";
      const sArtist = s.artist || "";
      const sYear = s.year || "";

      if (sTitle) {
        const details = [];
        if (sArtist) details.push(sArtist);
        if (sYear) details.push(sYear);

        if (details.length > 0) {
          sampling = `Sample: ${sTitle} (${details.join(", ")})`;
        } else {
          sampling = `Sample: ${sTitle}`;
        }
      }
    }

    // ==== Production / publisher / year (null-safe) ====
    let extraMain = "";
    {
      const prod = track.production || "";
      const pub = track.publisher || "";
      const year = track.year || "";

      const meta = [];
      if (pub) meta.push(pub);
      if (year) meta.push(year);

      if (prod && meta.length > 0) {
        extraMain = `${prod} (${meta.join(", ")})`;
      } else if (prod) {
        extraMain = prod;
      } else if (meta.length > 0) {
        extraMain = meta.join(", ");
      } else {
        extraMain = "";
      }
    }

    // ==== Category: label + text ====
    const categoryLabel = track.category
      ? `<span class="track-category">[${track.category}]</span>`
      : "";

    const category = track.category
      ? ` – ${track.category.charAt(0).toUpperCase()}${track.category.slice(1)}`
      : "";

    // ==== Type badge (with icon) ====
    let typeBadge = "";
    if (track.type) {
      const type = track.type;
      let icon = "";
      let typeClass = "";

      if (type === "Ringtone") {
        icon = "🔔";
        typeClass = "ringtone";
      } else if (type === "Notification") {
        icon = "✉️";
        typeClass = "notification";
      }

      typeBadge = `<span class="track-type ${typeClass}">${icon} ${type}</span>`;
    }

    // ==== Build track HTML ====
    div.innerHTML = `
      <div class="track-title">
        ${safe(track.title)} – ${safe(track.platform)} – ${safe(track.variant)}
        ${typeBadge}
      </div>
    
      <div class="track-meta">
        ${safe(composerLine)} ${categoryLabel}
      </div>
    
      <audio controls src="${track.file}"></audio>
    
      <div class="track-toggle">
        more ▾
      </div>
    
      <div class="track-extra">
        ${safe(extraMain)}${category}<br>
        ${safe(sampling)}
      </div>
    `;

    container.appendChild(div);
  });

  // Toggle "more ▾/▴"
  container.querySelectorAll(".track-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const trackDiv = toggle.parentElement;
      const isOpen = trackDiv.classList.toggle("open");
      toggle.textContent = isOpen ? "more ▴" : "more ▾";
    });
  });

  // Only one audio at a time
  const audios = container.querySelectorAll("audio");
  audios.forEach(audio => {
    audio.addEventListener("play", () => {
      audios.forEach(a => {
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

  // Platform filter buttons
  document.querySelectorAll(".filters button").forEach(btn => {
    const platformFilter = btn.getAttribute("data-filter");
    if (!platformFilter) return;

    btn.addEventListener("click", () => {
      setFilter(platformFilter);
    });
  });

  // Type filter buttons
  document.querySelectorAll(".filters-type button").forEach(btn => {
    const typeFilter = btn.getAttribute("data-type-filter");
    if (!typeFilter) return;

    btn.addEventListener("click", () => {
      setTypeFilter(typeFilter);
    });
  });

  loadData();
});
