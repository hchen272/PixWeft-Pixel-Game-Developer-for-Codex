# Building design prompts

Route: Codex built-in `image_gen`, one asset per request. The user selected these
three generated buildings as the actual drafts to refine, replacing simplified
redraw candidates. The final sources preserve their architecture and material
detail, with real Pixelorama alpha corrections and small local animations. The
prompt's requested logical resolution is not a claim about the generator's
actual output dimensions. Native canvases are 256 x 256 for the two houses and
384 x 256 for the outpost, preserving each input's aspect ratio. No numerical
palette restriction was requested.

## Woodland cottage

```text
Use case: stylized-concept, production game sprite. Create ONE beautiful standalone woodland cottage building for the PixWeft pixel-game-development plugin README showcase. It is a real pixel-art game asset, drawn with deliberate hard-edged pixel clusters, consistent square pixels, crisp stepped silhouettes and readable pixel-made materials, NOT a smooth illustration with a pixel filter. Style: warm, charming, chunky storybook pixel art, tasteful rich colors with no numerical palette restriction. A compact European timber-and-plaster cottage with a steep moss-green shingle roof, small brick chimney, glowing amber windows, a complete rounded wooden door and stone doorstep, a tiny attached flower box and a few foundation plants. Show the complete building, complete chimney, roof, eaves, door, foundation and every attached detail. Three-quarter orthographic game view, see front and right side, coherent roof perspective. Single isolated building only, no large landscape or tile plate. Composition: center subject with generous transparent clearance on all sides and above the chimney. Target editable canvas 256 x 256 pixels; intended final display 512 x 512 nearest-neighbor. Render as an exact clean enlarged pixel-art design, with no antialiasing or soft photographic textures. Lighting is part of pixel clusters; avoid cast shadows outside the small foundation silhouette. Genuine transparent background with clean alpha, no checkerboard, backdrop, text, logo, watermark, border, diagram, caption, or extra building.
```

Observation: input is 1254 x 1254 RGBA. The final Pixelorama document imports the
selected image, preserves its roof, timber, stone, plants, door, and windows,
cleans the alpha edges, and adds a separate local smoke/light animation layer.

## Lunar outpost

```text
Production game asset for PixWeft README: ONE isolated compact lunar research outpost building in crisp modern SCI-FI PIXEL ART. Three-quarter orthographic/isometric view, coherent architecture showing front and left face. A small white-and-cool-blue modular station with a sealed orange airlock door, ribbed metal roof, a complete round radar dish on a short mast, small cyan-lit windows, solar panel wing folded beside the building, pipes and industrial supports. Beautiful precise color blocking and high contrast, no numerical color-count limit. A distinctly different visual treatment from cozy fantasy art: clean industrial geometry, sharp pixel-cluster metal highlights, compact angular silhouette. Genuine deliberate pixel art designed on a 256x256 logical canvas and enlarged by nearest-neighbor: consistent square pixels, intentional stairstep edges, no smooth painted gradients, no antialiased lines, no photographic texture. Entire single building and every dish/panel/support fully visible with generous transparent padding. No large landscape base, no stars/sky, no other buildings. Actual transparent background; no checkerboard, labels, writing, logo, watermark, frame or caption. The building is an individually reusable sprite.
```

Observation: input is 1536 x 1024 RGBA with mostly 252/253 foreground alpha and
hidden RGB in transparent background pixels. An early preview prompted this
background-extraction experiment:

```text
Edit this one lunar outpost asset. Remove ONLY the broad gray atmospheric fog, external cyan/orange bloom and all surroundings outside the hard building silhouette, replacing that entire negative space with genuine fully transparent alpha. Keep the complete station's geometry, radar dish, solar panel, supports, steps, windows, pixel details, colors and framing unchanged. Window lights may remain as sharp pixels inside windows. No diffuse glow outside the object, no ground/background plane, no halo/checkerboard, no new objects or text. Preserve its crisp pixel-art medium.
```

The extraction experiment was not selected. The final source uses the original
image selected by the user, corrected through Pixelorama to clean binary alpha
and transparent RGB. The full dish, panel, supports, pipes, airlock, and stairs
remain intact. The actual dish pixels occupy a separate native layer and scan
through a small +/-4 degree pitch motion around the fixed mount. The initial
rectangular extraction cut through the mast and was rejected. The corrected
source retains the complete tapered mast and collar in the stationary base,
uses a pivot at the actual socket, and finishes each pose with explicit native
pixel retouching of its contours and material junction. All eight joint crops,
the decoded GIF, and its loop boundary are reviewed separately from source
fidelity. Selected interior light pixels also animate; the structure remains fixed.

## Mediterranean bookshop

```text
Create ONE gorgeous standalone sunlit Mediterranean bookshop building as a production PIXEL ART game sprite for the PixWeft README. A distinct bright architectural pixel-art style: coral-pink and warm cream stucco, turquoise wooden shutters and striped cloth awning, terracotta roof, a small arched glass entry, a few books displayed in the shop window, rooftop potted plants and one tiny attached balcony. Side/front three-quarter orthographic game view with consistent perspective, single compact two-storey building. Rich tasteful colors without a numerical palette limit. This must be actual crisp pixel art on a 256x256 logical grid, deliberate square pixel clusters and clean staircase edges, hard-edged pixel shading; no soft illustration, smooth 3D rendering, antialiasing, blur or photographic texture. Show the complete roof, balcony, window, awning, doorway and foundation, with generous empty padding all around. No text or readable lettering on the shop front. Actual completely transparent background outside the asset, no environment, ground plane, haze, glow outside silhouette, checkerboard, border, watermark, diagram, label or second building. Intended game display is nearest-neighbor at 2x.
```

Observation: input is 1254 x 1254 RGBA, complete but with near-invisible fringe
pixels. The final source preserves its roof, shutters, books, balcony, plants,
and entry, cleans the alpha, and adds local light/detail motion while the
architectural base stays fixed.
