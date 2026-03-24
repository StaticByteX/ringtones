let tracks = [];
let currentFilter = "all";

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

/* FILTER */
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

/* RENDER */
function render() {
  const container = document.getElementById("tracklist");
  const searchInput = document.getElementById("search");
  const query = (searchInput?.value || "").toLowerCase();

  container.innerHTML = "";

  const filtered = tracks.filter(t => {
    const matchesFilter =
      currentFilter === "all" || t.platform.toLowerCase() === currentFilter;

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
    `.toLowerCase();

    const matchesSearch = searchableText.includes(query);

    return matchesFilter && matchesSearch;
  });

// 🔹 Sort alphabetically by title, then variant
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

    resultsInfo.textContent = `${count} ${trackWord} found (filter: ${filterLabel})`;
  }
  
  filtered.forEach(track => {
    const div = document.createElement("div");
    div.className = `track ${track.platform.toLowerCase()}`;

    /* Composer logic */
    let composerLine = "";

    if (track.composer?.handle) {
      composerLine = `${track.composer.handle} (${track.composer.name})`;
    } else {
      composerLine = `${track.composer?.name || ""}`;
    }

    if (track.composer?.group) {
      composerLine += ` – ${track.composer.group}`;
    }

    /* Sampling */
    const sampling = track.sampling?.title
      ? `Sample: ${track.sampling.title} (${track.sampling.artist}, ${track.sampling.year})`
      : "";

    /* Category label */
    const categoryLabel = track.category
      ? `<span class="track-category">[${track.category}]</span>`
      : "";
    
    div.innerHTML = `
      <div class="track-title">
        ${safe(track.title)} – ${safe(track.platform)} – ${safe(track.variant)}
      </div>
    
      <div class="track-meta">
        ${safe(composerLine)} ${categoryLabel}
      </div>
      ...
    `;

      <audio controls src="${track.file}"></audio>

      <div class="track-toggle">
        more ▾
      </div>

      <div class="track-extra">
        ${safe(track.production)} (${safe(track.publisher)}, ${safe(track.year)})${category}<br>
        ${sampling}
      </div>
    `;

    container.appendChild(div);
  });

  // Toggle "more ▾"
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
  // Search input live update
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", () => render());
  }

  // Filter buttons
  document.querySelectorAll(".filters button").forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.getAttribute("data-filter");
      setFilter(filter);
    });
  });

  loadData();
});
