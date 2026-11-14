// A testing switch that silences every clip and video, for driving the app in a browser nobody should
// hear. `?mute=1` turns it on and `?mute=0` off; the choice is remembered in this browser's
// localStorage. It works in production builds too, since the offline check runs the built app.
const KEY = 'dev-mute'

function read(): boolean {
  try {
    const param = new URLSearchParams(location.search).get('mute')
    if (param === '1') localStorage.setItem(KEY, '1')
    else if (param === '0') localStorage.removeItem(KEY)
    return localStorage.getItem(KEY) === '1'
  } catch {
    return new URLSearchParams(location.search).get('mute') === '1'
  }
}

/** True when the clip player and YouTube embeds must stay silent. Read once at start. */
export const devMuted: boolean = read()
