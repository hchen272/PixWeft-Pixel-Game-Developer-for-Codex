# Godot bridge

Original GDScript adapters for Godot 4.6.3. No editor installation is required.
Each request starts an isolated process in an explicitly selected, trusted
project. Project scripts and autoloads execute during normal engine startup;
scene property edits can also execute script initialization. This is not a
sandbox for untrusted games. Do not edit the same scene in a live editor and
through this adapter concurrently.

## Invocation

```text
godot --headless --path PROJECT --log-file PROJECT/.pixel-game/runs/engine.log \
  --script PLUGIN/bridges/godot/operations.gd -- REQUEST.json RESPONSE.json
```

The caller creates the log/request/response parent directory first. Use
`runtime_runner.gd` for runtime sequences. Capture requires a rendered process:
omit `--headless`. The Node wrapper launches subprocesses with hidden console
windows; a rendered engine window can still be created by the OS. Do not
interpret headless state inspection as a visual review.

```json
{
  "operation": "scene_inspect",
  "project_root": "/absolute/project/path",
  "request_id": "unique-id",
  "args": { "scene_path": "res://main.tscn" }
}
```

Responses contain `ok`, `operation`, `request_id`, `engine_version`, `data`, and
an `error` object on failure. A nonzero process exit and partial observations
must not be reported as success. No method-call or arbitrary-evaluation RPC is
available. Scene/resource paths use `res://`; capture paths must stay inside the
project. The caller must additionally reject symlinks/junctions escaping its
approved project, because GDScript's lexical checks do not resolve all reparse
points.

## Operations

| Operation | Arguments | Result |
| --- | --- | --- |
| `project_inspect` | none | Project metadata, viewport, main scene, input actions |
| `scene_inspect` | `scene_path`, optional `max_depth`, `properties` | Serialized authored node state, without node instantiation; does not include all inherited defaults |
| `scene_create` | `scene_path`, `root`, optional `overwrite=false` | Saves native node tree; `root` has `type`, `name`, optional `properties`, `children` |
| `scene_set_properties` | `scene_path`, `node_path="."`, `properties` | Sets validated existing properties and repacks the scene |
| `resource_inspect` | `resource_path`, optional `properties` | Resource class/properties and texture size when applicable |
| `project_set_settings` | `settings` | Saves project settings; autoload settings are protected |
| `image_inspect` | `resource_path` or `path`, optional `constraints` | Actual dimensions, RGBA color counts, alpha counts, visible bounds, hashes and optional constraint checks |
| `runtime_sequence` | `scene_path` optional, `frames_before=2`, `steps` | Real runtime input and observations; use runtime runner |

`image_inspect` accepts explicit `width`, `height`, `max_colors`, and
`max_partial_alpha_pixels` constraints. There are no project-wide default
palette or size rules. A failed constraint remains a returned observation;
`ok=true` means measurement succeeded, not that every constraint passed. There
is a 16-megapixel inspection budget and a 256-entry palette sample. Dimensions
and color counts do not establish visual completeness or pixel-art quality.
Optional `frame_rects:[{"name":"idle-0","rect":[0,0,32,32]}]` reports each
frame's visible bounds and emptiness without choosing a sprite size or layout.

JSON typed property values support `Vector2`, `Vector2i`, `Rect2`, `Color`,
`NodePath`, and `Resource`, for example
`{"$type":"Vector2","value":[10,20]}` or
`{"$type":"Resource","value":"res://sprite.png"}`. `script` and `owner`
properties are protected. Add custom scripts through normal project-file
editing, then run them as trusted project code.

## Runtime steps

- `input`: `action`, `pressed`, optional `strength`, `frames=1`.
- `key`: numeric Godot `keycode`, `pressed`, optional physical key/modifiers,
  `frames=1`.
- `mouse_button`: viewport `position:[x,y]`, `button=1`, `pressed`, `frames=1`.
- `wait`: `frames`.
- `inspect`: `node_path="."`, `properties` array; returns runtime properties and
  immediate children.
- `capture`: `output_path` ending in `.png`; returns dimensions and file hash.

Budgets: 256 steps, 3600 frames per step, 7200 frames total. These bound tool
execution, not gameplay. The wrapper must also impose a process timeout.
Runtime sequences start a fresh process; they do not attach to an already
running editor/game or persist sessions between calls. Screenshots are viewport
captures, not whole desktop captures. No gameplay-specific assertions are built
into the adapter.

## Verification

Set `GODOT_BIN` to the console executable and run
`node --test tests/godot.integration.test.mjs`. Set `GODOT_RENDER_TEST=1` to
include an actual rendered capture. The integration test copies the neutral
fixture to a temporary project and tests scene edits, rejected edits, exact
image measurements, real action input, collision, interaction, restart,
failure reporting, and optionally rendering. Fixture assertions are isolated
from generic tools. Tests skip when no executable is configured.
