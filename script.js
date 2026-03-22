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

  const results = await Promise.all(
    sources.map(src => fetch(src).then(res => res.json()))
  );

  tracks = results.flat();
  render();
}

/* FILTER */
function setFilter(filter) {
  currentFilter = filter;
  render();
}

/* RENDER */
function render() {

  const container = document.getElementById("tracklist");
  const query = document.getElementById("search").value.toLowerCase();

  container.innerHTML = "";

  const filtered = tracks.filter(t => {

    const matchesFilter =
      currentFilter === "all" || t.platform === currentFilter;

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

  filtered.forEach(track => {

    const div = document.createElement("div");
    div.className = `track ${track.platform}`;

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
      ? `Sample: ${track.sampling.title} (${track.sampling.artist}, (${track.sampling.year}))`
      : "";

    div.innerHTML = `
      <div class="track-title">
        ${track.title} – ${track.platform} – ${track.variant || ""}
      </div>

      <div class="track-meta">
        ${composerLine}
      </div>

      <audio controls src="${track.file}"></audio>

      <div class="track-toggle" onclick="this.parentElement.classList.toggle('open')">
        more...
      </div>

      <div class="track-extra">
        ${safe(track.production)} (${safe(track.publisher)}, ${safe(track.year)})<br>
        ${sampling}
      </div>
    `;

    container.appendChild(div);
  });

  /* Only one audio at a time */
  document.querySelectorAll("audio").forEach(audio => {
    audio.addEventListener("play", () => {
      document.querySelectorAll("audio").forEach(a => {
        if (a !== audio) a.pause();
      });
    });
  });
}

/* INIT */
loadData();
