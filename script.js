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

  // 🔹 Sorter alfabetisk efter titel, dernæst variant
  filtered.sort((a, b) => {
    const titleA = (a.title || "").toLowerCase();
    const titleB = (b.title || "").toLowerCase();

    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;

    const varA = Number(a.variant) || 0;
    const varB = Number(b.variant) || 0;
    return varA - varB;
  });

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

    /* Category (Game, Musicdisk, etc.) */
    const category = track.category
      ? ` – ${track.category.charAt(0).toUpperCase()}${track.category.slice(1)}`
      : "";

    div.innerHTML = `
      <div class="track-title">
        ${safe(track.title)} – ${safe(track.platform)} – ${safe(track.variant)}
      </div>

      <div class="track-meta">
        ${safe(composerLine)}
      </div>

      <audio controls src="${track.file}"></audio>

      <div class="track-toggle">
        more...
      </div>

      <div class="track-extra">
        ${safe(track.production)} (${safe(track.publisher)}, ${safe(track.year)})${category}<br>
        ${sampling}
      </div>
    `;

    container.appendChild(div);
  });

  // Toggle "more..."
  container.querySelectorAll(".track-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
      toggle.parentElement.classList.toggle("open");
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
