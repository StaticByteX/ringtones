let tracks = [];
let currentFilter = "all";

async function loadData() {
  const sources = [
    "data/ringtones-c64.json",
    "data/ringtones-amiga.json",
    "data/ringtones-pc.json"
  ];

  const results = await Promise.all(
    sources.map(src => fetch(src).then(res => res.json()))
  );

  tracks = results.flat(); // merges all arrays into one
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  render();
}

function render() {
  const container = document.getElementById("tracklist");
  container.innerHTML = "";

  const filtered = tracks.filter(t => 
    currentFilter === "all" || t.platformClass === currentFilter
  );

  filtered.forEach(track => {
    const div = document.createElement("div");
    div.className = `track ${track.platformClass}`;

    div.innerHTML = `
      <div class="track-title">
        ${track.title} – ${track.platform} – ${track.variant}
      </div>

      <div class="track-meta">
        ${track.composer.handle} (${track.composer.name}) – ${track.composer.group}
      </div>

      <audio controls src="${track.audio}"></audio>

      <div class="track-toggle" onclick="this.parentElement.classList.toggle('open')">
        more...
      </div>

      <div class="track-extra">
        ${track.production.category} – ${track.production.year} – ${track.production.publisher}<br>
        ${track.sampling.title ? 
          `Contains samples: ${track.sampling.title} – ${track.sampling.artist} (${track.sampling.year})` 
          : "Contains samples: None"}
      </div>
    `;

    container.appendChild(div);
  });
}

loadData();
