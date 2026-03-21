let tracks = [];
let currentFilter = "all";

async function loadData() {
  const res = await fetch("data.json");
  tracks = await res.json();
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
          `Sample: ${track.sampling.title} – ${track.sampling.artist} (${track.sampling.year})` 
          : "Sample: None"}
      </div>
    `;

    container.appendChild(div);
  });
}

loadData();
