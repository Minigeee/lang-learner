import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'node:fs'
import { resolveVars, themes } from './theme.mjs'
// Rasterize a themed SVG string to PNG on the theme's page background.
export function toPng(svg, theme, file, width = 640) {
  const resolved = resolveVars(svg, theme)
  const r = new Resvg(resolved, {
    background: themes[theme]['surface-2'],
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: 'Microsoft YaHei' },
  })
  writeFileSync(file, r.render().asPng())
}
