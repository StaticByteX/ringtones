let allRingtones = []
let filteredRingtones = []

let itemsPerLoad = 30
let currentIndex = 0
let isLoading = false


// Load JSON
Promise.all([
  fetch("data/ringtones-c64.json").then(res => res.json()),
  fetch("data/ringtones-amiga.json").then(res => res.json()),
  fetch("data/ringtones-pc.json").then(res => res.json())
])
.then(([c64, amiga, pc]) => {

  allRingtones = [...c64, ...amiga, ...pc]
  filteredRingtones = allRingtones

  renderNextBatch()

})


// Search
document.getElementById("search").addEventListener("input", e => {

  const term = e.target.value.toLowerCase()

  filteredRingtones = allRingtones.filter(r => {

    const composerHandle = r.composer?.handle?.toLowerCase() || ""
    const composerName = r.composer?.name?.toLowerCase() || ""
    const composerGroup = r.composer?.group?.toLowerCase() || ""

    return (
      r.title.toLowerCase().includes(term) ||
      r.platform.toLowerCase().includes(term) ||
      (r.production || "").toLowerCase().includes(term) ||
      composerHandle.includes(term) ||
      composerName.includes(term) ||
      composerGroup.includes(term)
    )

  })

  currentIndex = 0
  document.getElementById("ringtones").innerHTML = ""

  renderNextBatch()

})


// Render batch
function renderNextBatch(){

  if(isLoading) return
  isLoading = true

  const container = document.getElementById("ringtones")

  const slice = filteredRingtones.slice(currentIndex, currentIndex + itemsPerLoad)

  slice.forEach(r => {

    const item = document.createElement("div")
    item.className = "ringtone"

    const composerHandle = r.composer?.handle || ""
    const composerName = r.composer?.name || ""
    const composerGroup = r.composer?.group || ""

    let composerDisplay = composerHandle

    if(composerName){
      composerDisplay += ` (${composerName})`
    }

    if(composerGroup){
      composerDisplay += ` - ${composerGroup}`
    }

    item.innerHTML = `
      <h3>${r.title}</h3>

      <p>
        ${r.production || ""} • ${composerDisplay}
      </p>

      <audio controls preload="none" src="${r.file}"></audio>

      <br>

      <a href="${r.file}" download>Download</a>
    `

    container.appendChild(item)

  })

  currentIndex += itemsPerLoad
  isLoading = false

}


// Infinite scroll (Intersection Observer)
const sentinel = document.getElementById("scroll-sentinel")

const observer = new IntersectionObserver(entries => {

  if(entries[0].isIntersecting){

    if(currentIndex < filteredRingtones.length){
      renderNextBatch()
    }

  }

}, {
  rootMargin: "200px"
})

observer.observe(sentinel)
