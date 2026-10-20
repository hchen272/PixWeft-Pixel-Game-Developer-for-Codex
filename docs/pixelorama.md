# Pixelorama bridge

The bridge runs inside **Pixelorama 1.1.10-stable, Extensions API 8**. The local baseline application embeds Godot 4.6.2. The extension is packed with Godot 4.6.3; no Pixelorama binary or application source is included in this repository.

The implementation is original and uses the published API 8 project, import, palette, and drawing interfaces. It does not bundle an upstream MCP command handler or expose arbitrary code evaluation.

## Build and enable

Build from the repository root using a Godot 4.6.3 executable. Create the output directory first:

```powershell
New-Item -ItemType Directory -Force bridges/pixelorama/build
& $GodotPath --headless --script bridges/pixelorama/pack.gd -- "$PWD/bridges/pixelorama" "$PWD/bridges/pixelorama/build/PixelGameBridge.pck"
```

`$GodotPath` is the user's own executable path. Keep the output name `PixelGameBridge.pck`: Pixelorama resolves extension resources from the pack filename.

In Pixelorama, open **Edit > Preferences > Extensions**, install the generated pack, and enable **Pixel Game Bridge**. Restart after changing bridge configuration. The bridge remains disabled until explicitly configured.

Create `pixel-game-bridge.json` in Pixelorama's user data directory (`user://`; normally `%APPDATA%/pixelorama` on Windows), or set `PIXEL_GAME_PIXELORAMA_CONFIG` to an absolute configuration filename before launching Pixelorama:

```json
{
  "port": 32124,
  "token": "REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_16_CHARACTERS",
  "allowed_roots": ["/absolute/path/to/your/game"]
}
```

Generate a fresh random token, for example `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Configure the same token and `http://127.0.0.1:32124` in the game's local plugin configuration. Do not commit the secret. The bridge binds only to IPv4 loopback, requires the Bearer token on every endpoint, and supplies no browser CORS permission.

Example local game configuration (`.pixel-game/project.local.json`):

```json
{
  "tools": {
    "pixelorama_path": "/absolute/path/to/Pixelorama.exe",
    "pixelorama_url": "http://127.0.0.1:32124",
    "pixelorama_token": "THE_SAME_RANDOM_SECRET"
  }
}
```

Installing or enabling an extension changes the selected Pixelorama installation's preferences. The plugin does not automatically change the user's running application or install this extension during repository setup.

## Supported operations

All indices are zero-based. Canvas dimensions and palette colors are supplied by the project; the bridge imposes no creative defaults.

| Operation | Arguments |
| --- | --- |
| `app.info` | None; reports application, API, engine, bridge version, and supported operations. |
| `document.info` | None; reports the active document identity, revision, content fingerprint, canvas, frame/layer counts, animation FPS, palettes, and save path. |
| `document.create` | Required integer `width`, `height`; optional `name`. Creates a transparent document in a new tab. |
| `document.open_image` | Required `path`. Opens an image as a new document without displaying an import dialog. |
| `document.import_sheet` | Required image `path`, positive integer `columns`, `rows`, `frame_width`, `frame_height`; optional `name`, `frame_rects: [[x,y,width,height], ...]`. Creates a new editable animation document, normalizing each source cell to the explicit target canvas with nearest-neighbor sampling. |
| `document.open_project` | Required `.pxo` `path`. Opens an editable project in a new tab, explicitly disabling the native default that reuses an empty document. |
| `document.patch_pixels` | Required `pixels: [{x,y,color}]`; optional `frame`, `layer`. Exact replacement colors use `#RRGGBB` or `#RRGGBBAA`. |
| `document.add_frame` | Optional `after_frame`, defaulting to the active frame. Uses Pixelorama's native add-frame operation. |
| `document.set_animation_fps` | Required finite numeric `fps` from 1 to 120. Guarded by document identity/revision. Sets the native project's animation FPS, verifies readback, and returns the actual value; `document.info` also reports `fps`. |
| `document.add_layer` | Optional `name`. Adds a pixel layer above the active layer. |
| `document.palette` | Required explicit `colors` array; optional `name`. Creates a project palette; does not quantize or remap pixels. |
| `document.save` | Required `.pxo` `path`. Uses native editable-project save and checks the resulting archive. |
| `document.preview` | Optional `frame`, `layer`, integer `scale`, in-bounds integer `region: [x,y,width,height]`. Region inspection crops before nearest-neighbor magnification and reports the original dimensions and selected region. Returns PNG bytes as base64, dimensions, and document identity. |
| `document.export_png` | Required `.png` `path`; optional `frame`, `layer`, integer `scale`. |
| `document.export_sheet` | Required `.png` `path`; optional `columns`, integer `scale`. Exports all composite frames with transparent unused cells. |

Preview and single-frame PNG export composite visible layers through Pixelorama's native drawing implementation unless `layer` is supplied. Explicit layer export returns the raw pixel cel; it intentionally does not apply layer opacity or effects. Sheet export always composites frames. Scaling is nearest-neighbor and integer-only; its default is 1.

Sheet import reads cells in row-major order. With no `frame_rects`, each grid boundary is `round(index * source_extent / cell_count)`, so non-divisible generator sizes are covered without dropping the last source row or column. Explicit rectangles must be positive, in bounds, and number exactly `columns * rows`; their array order determines animation order. The operation validates every rectangle and prepares all normalized images before creating a new native project. It preserves RGBA samples, includes transparent and empty frames, and does not trim, remove backgrounds, quantize colors, or write to the source file. Width and height are deliberately independent: choose targets with the intended aspect ratio to avoid distortion.

Use `columns: 1, rows: 1` for an explicitly requested single-image normalization. This import is separate from export's integer-only display enlargement; its explicit target canvas may be smaller or larger than a source cell. The response reports the source dimensions and SHA-256, actual source rectangles, target frame dimensions, frame count, grid, per-frame scale factors, and nearest interpolation. Save the resulting document with `document.save` and export through the existing PNG/sheet operations. Import itself does not export files. Limits are 64 frames, 16,777,216 source pixels, and 16,777,216 destination pixels across all frames.

Pixel correction validates every requested pixel before committing one native undoable edit. A malformed or out-of-bounds pixel rejects the complete batch. Indexed-color documents can alter requested RGBA values through their native palette behavior; the bridge checks the written pixels and reports `EDIT_NOT_EXACT` instead of claiming an exact edit. Inspect the changed document before continuing after that error.

## Document conflicts and transport

The MCP `pixelorama_operation` tool accepts the operation and its arguments, then sends this authenticated request:

```json
{
  "request_id": "unique-operation-id",
  "operation": "document.patch_pixels",
  "project_root": "/absolute/path/to/your/game",
  "document_id": "value-returned-by-document.info",
  "expected_revision": 3,
  "args": {
    "frame": 0,
    "layer": 0,
    "pixels": [{"x": 2, "y": 4, "color": "#a8c0df80"}]
  }
}
```

`document_id` and `expected_revision` are required for edits, project save, and file exports. Read the current information first and use the returned revision for the next operation. Switching tabs produces a different identity. Content or serialized project changes, including ordinary application edits observed by the next request, advance the revision. A new application session creates new identities.

Opening a native project can schedule further application updates to its name, path, selection, or serialized state after the open response snapshot. Refresh `document.info` before the next guarded edit/export rather than assuming that snapshot remains current. On `REVISION_CONFLICT`, inspect the returned current document and refresh intentionally; do not disable the guard or blindly replay an edit. When building several layers, remember that `document.add_layer` inserts above the active layer: repeated insertions above an unchanged selection reverse insertion order. Inspect the resulting layer list and address the intended layer indices explicitly.

The extension provides `GET /health` and `POST /command`. Successful results have `{ok, request_id, operation, data}`; failures have `{ok:false, request_id, operation, error:{code,message,details}}`. The MCP server converts preview PNG data into MCP image content and retains a concise run receipt.

Completed request IDs are cached in memory (up to 128 entries, approximately 32 MiB). An identical recent request returns its original result; reuse for different content fails. This cache is not durable and is not a transaction across several calls. After an unconfirmed timeout, read document information and inspect the operation's files before deciding whether to retry. Every application action executes serially on its main thread.

Paths must stay within the requested `project_root`, which must itself fall under a configured allowed root. Symbolic-link traversal is rejected where Godot reports it. The MCP client additionally validates real filesystem paths. Destination directories must already exist. HTTP request bodies are limited to 4 MiB; pixel patches to 65,536 pixels; palette creation to 256 colors; output images to 16,777,216 pixels. These are operational bounds, not project style rules.

## Native verification

This opt-in Windows integration test builds the pack and launches an isolated copy of the baseline application:

```powershell
node tests/pixelorama-native.mjs --godot $GodotPath --pixelorama-dir $PixeloramaDirectory
```

The test copies only `Pixelorama.exe` and `Pixelorama.pck` into the repository's ignored `.local/pixelorama-native` directory. The child process receives private `APPDATA` and `LOCALAPPDATA` directories, a private port/token, and fresh preferences. Existing Pixelorama documents, installed extensions, and preferences are not used or modified. The test stops only its own child process.

The verified native checks include authentication; document/revision conflicts; duplicate-request handling; batch rejection without partial pixel changes; actual PNG image preview; exact RGBA including semi-transparency through PNG import/export and editable `.pxo` save/reopen; native frame/layer creation; project-palette persistence; composited preview; sheet dimensions and pixels; and path rejection. Results are written to `.local/pixelorama-native/verification.json` with accompanying native logs. Pixelorama's headless startup can emit upstream shader-compiler warnings; the assertions still check the returned image bytes. This does not certify arbitrary blend modes, effects, or every document type.

After the baseline test has prepared its private application copy, focused sheet-import verification can reuse that binary with a separate private profile:

```powershell
node tests/pixelorama-sheet-native.mjs --godot $GodotPath
```

An optional `--pixelorama-dir` selects another binary directory. The test verifies non-divisible grid boundaries, explicit rectangle order, nearest-neighbor RGBA preservation, editable save/reopen, no source overwrite, single-image import, and rejection before document creation. Its reports and private preferences remain in `.local/pixelorama-sheet-native/`.

## Scope and next extensions

This first bridge supports focused pixel edits, explicit image/sheet normalization, and basic frame/layer assembly. Complex selection transforms, animation-tag editing, multi-file cel import, and custom exporter formats remain future bridge operations. Codex can still prepare source images and code, but should not report an unsupported native operation as completed. Visual quality and animation quality require the review workflow after tool success.

API references: [Pixelorama Extensions API](https://pixelorama.org/extension_system/extension_api/), [version 1.1.10 API source](https://github.com/Orama-Interactive/Pixelorama/blob/v1.1.10/src/Autoload/ExtensionsApi.gd), [native editable-project import and save](https://github.com/Orama-Interactive/Pixelorama/blob/v1.1.10/src/Autoload/OpenSave.gd).
