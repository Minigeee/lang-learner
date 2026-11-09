// Tries three ways to embed one YouTube video and reports, through a Tauri command, whether each
// reaches PLAYING or fails with an error code (153 is the missing-referrer error).
const VIDEO = 'uvtZpiQs4sI'
const logEl = document.getElementById('log')

function report(line) {
  logEl.textContent += line + '\n'
  window.__TAURI__?.core.invoke('report', { line }).catch(() => {})
}

report(`origin=${location.origin} secure=${window.isSecureContext} ua=${navigator.userAgent}`)
document.getElementById('origin').textContent = `Origin: ${location.origin}`

const done = new Set()
function result(name, outcome) {
  if (done.has(name)) return
  done.add(name)
  report(`RESULT ${name}: ${outcome}`)
}

window.onYouTubeIframeAPIReady = () => {
  for (const [id, host] of [['a', 'https://www.youtube.com'], ['b', 'https://www.youtube-nocookie.com']]) {
    // eslint-disable-next-line no-new
    new YT.Player(id, {
      host,
      videoId: VIDEO,
      playerVars: { playsinline: 1, origin: location.origin },
      events: {
        onReady: (e) => { report(`${id} ready`); e.target.mute(); e.target.playVideo() },
        onStateChange: (e) => { if (e.data === 1) result(id, 'PLAYING') },
        onError: (e) => result(id, `ERROR ${e.data}`),
      },
    })
  }
}

const tag = document.createElement('script')
tag.src = 'https://www.youtube.com/iframe_api'
tag.onerror = () => report('iframe_api failed to load')
document.head.appendChild(tag)

document.getElementById('c').src = `https://www.youtube.com/embed/${VIDEO}?playsinline=1&autoplay=1&mute=1`
setTimeout(() => {
  for (const id of ['a', 'b']) result(id, 'TIMEOUT (no ready/error in 25 s)')
  report('C (plain iframe) has no API events: check it by eye')
}, 25000)
