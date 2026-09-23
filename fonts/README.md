# Bundled fonts

These are served from the repo rather than from Google Fonts so that
`html-to-image` can inline them when the flyer is exported. It can only read
`@font-face` rules from a same-origin stylesheet; with a cross-origin one it
embeds nothing, and the exported image silently falls back to Georgia/Arial
while keeping the text widths measured from the real fonts — which truncated
the date and location on every card.

| File | Family | Source |
|---|---|---|
| `manrope-variable-latin.woff2` | Manrope (variable, weights 200–800, latin subset) | Google Fonts |
| `instrument-serif-italic-latin.woff2` | Instrument Serif (italic 400, latin subset) | Google Fonts |

Both families are licensed under the SIL Open Font License 1.1, which permits
bundling and redistribution. The full licence text for each is available from
its Google Fonts page. If you want the complete `OFL.txt` for each family
committed alongside the binaries, add it here.
