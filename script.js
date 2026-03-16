let allRingtones = []

fetch("data/ringtones.json")
.then(res => res.json())
.then(data => {

    allRingtones = data
    renderRingtones(data)

})

document.getElementById("search").addEventListener("input", e => {

    const term = e.target.value.toLowerCase()

    const filtered = allRingtones.filter(r =>
        r.title.toLowerCase().includes(term) ||
        r.composer.toLowerCase().includes(term) ||
        r.game.toLowerCase().includes(term) ||
        r.platform.toLowerCase().includes(term)
    )

    renderRingtones(filtered)

})

function renderRingtones(list){

    const container = document.getElementById("ringtones")
    container.innerHTML = ""

    const grouped = {}

    list.forEach(r => {

        if(!grouped[r.platform]){
            grouped[r.platform] = []
        }

        grouped[r.platform].push(r)

    })

    for(const platform in grouped){

        const section = document.createElement("div")

        section.innerHTML = `<h2>${platform}</h2>`

        grouped[platform].forEach(r => {

            const item = document.createElement("div")

            item.className = "ringtone"

            item.innerHTML = `
            <h3>${r.title}</h3>

            <p>${r.game} • ${r.composer}</p>

            <audio controls src="${r.file}"></audio>

            <br>

            <a href="${r.file}" download>Download</a>
            `

            section.appendChild(item)

        })

        container.appendChild(section)

    }

}