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

    resultsInfo.textContent = `${count} ${trackWord} found (filter: ${filterLabel})`;
  }

  filtered.forEach(track => {
    const div = document.createElement("div");
    div.className = `track ${track.platform.toLowerCase()}`;

    /* Composer logic (avoid showing "null") */
    let composerLine = "";
    const comp = track.composer || {};
    const handle = comp.handle || "";
    const name = comp.name || "";
    const group = comp.group || "";
    
    // Case 1: handle + name
    if (handle && name) {
      composerLine = `${handle} (${name})`;
    }
    // Case 2: only handle
    else if (handle && !name) {
      composerLine = handle;
    }
    // Case 3: only name
    else if (!handle && name) {
      composerLine = name;
    } else {
      composerLine = "";
    }
    
    // Optional: group
    if (group) {
      // If there is already something, add it " – "
      composerLine = composerLine
        ? `${composerLine} – ${group}`
        : group;
    }
   
  /* Production/publisher/year (null-safe) */
  let extraMain = "";
  {
    const prod = track.production || "";
    const pub = track.publisher || "";
    const year = track.year || "";
  
    // Build a list of the parts that actually exist
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
    
    // Category label
    const categoryLabel = track.category
      ? `<span class="track-category">[${track.category}]</span>`
      : "";

    // Category for "more…"
    const category = track.category
      ? ` – ${track.category.charAt(0).toUpperCase()}${track.category.slice(1)}`
      : "";

    <div class="track-extra">
      ${extraMain}${category}<br>
      ${sampling}
    </div>

      <div class="track-meta">
        ${safe(composerLine)} ${categoryLabel}
      </div>

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

  // Toggle details
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

  document.querySelectorAll(".filters button").forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.getAttribute("data-filter");
      setFilter(filter);
    });
  });

  loadData();
});
