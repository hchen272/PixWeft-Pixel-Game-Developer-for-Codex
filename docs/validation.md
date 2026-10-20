# Validation scope and portability

The tool layer executes measurements and observations. A project supplies the target artifacts, constraints, inputs, and expected behavior. Workflow review interprets the evidence. These are separate responsibilities.

## Implemented checks

| Capability | Project-specific input | Result and boundary |
| --- | --- | --- |
| Package validation | Plugin source package | Manifest identity/version checks, discovery metadata, JSON, local links, language and machine-path checks; not a complete external schema certification |
| MCP integration | Tool arguments | Real stdio lifecycle, discovery, calls, error signaling, and returned image blocks |
| Local app doctor | Executables and bridge connection | Observed engine/application/API versions and availability; not quality approval |
| Path/document guards | Selected root and document identity/revision | Requested path containment, conflict detection, partial/error reporting, and uncertain outcome receipts; not a sandbox for untrusted project scripts |
| Image inspection | Image and optional constraints | Dimensions, RGBA colors, alpha, visible bounds, hashes, optional frame rectangles and explicit size/color/alpha checks |
| Native source round trip | Test document and requested exports | Pixelorama .pxo and PNG fidelity, layers/frames/palette, composite and sheet checks for the tested operations |
| Godot scene/resource operations | Scene, node, resource, or setting | Actual inspection/edit/readback and truthful failures |
| Runtime observation | Scene and bounded input/wait/inspect/capture sequence | Real input, returned properties, logs, and rendered images; the project must interpret these against its rules |
| Visual/gameplay review | User requirements and relevant observations | Reproduction, diagnosis, repair and re-review guidance; no automatic aesthetic or fun score |

## Choosing checks for a game

Use dimensions, palettes, actions, layouts, and scene paths adopted by that project. Leave unknowns open. Different asset classes can have different requirements. A measurement operation can succeed while a supplied constraint fails; inspect its returned checks.

Tile adjacency, freely placed-object depth, background coverage, animation transitions, UI resizing, navigation, and game rules need task-specific observations. This preview provides workflow guidance and engine primitives, not dedicated universal oracles for those conditions. Do not invent a grid, resource system, character action set, or success condition to make a test easier.

The neutral lab's movement, collision, interaction and restart assertions verify that the bridge can exercise an actual scene. Those assertions stay inside its fixture test. Other games supply their own observations and expected states.

## Evidence freshness

An operation receipt records parameters, time, plugin version, project.godot hash when present, and operation results. Native results include relevant engine and artifact observations. The receipt does not hash every script, image, setting, or indirect dependency. Before reusing a result, compare the task's actual dependencies and rerun affected checks after changes.

`running`, `completed`, `failed`, and `unknown` describe operation outcomes. Review/check records use `passed`, `failed`, `not_run`, or `blocked`. Neither a completed operation nor an unconfigured optional test implies game quality approval.

Lost or timed-out mutation responses require reconciliation through document state and files. The Pixelorama request cache is bounded and in-memory. It is not a durable transaction across calls.

## Initial validation record

Native validation was performed on Windows with Godot 4.6.3, Pixelorama 1.1.10-stable/API 8, and Node 24.15.0. The configured full Node suite passed 11 tests without skips. The opt-in native Pixelorama suite passed 18 bridge commands plus an actual MCP stdio proxy/image/receipt check. Its private application copy used isolated preferences and documents.

A separate read-only skill trial handled a prompt-only request for a freely placed prop without operating apps, writing files, selecting an unrequested canvas, or assigning an unrequested palette. This is one bounded behavioral observation, not a broad evaluation of every skill or game genre.

Local evidence is kept under ignored `.local/` test directories. It is not included in source publication. Portable Node tests can run without native applications; native tests explicitly skip or require opt-in when prerequisites are absent. The CI file is a configuration, not evidence that a hosted run has occurred.

Interactive Codex Desktop plugin installation, other native operating systems, other app versions, complex Pixelorama effects, and persistent editor sessions are not certified by these checks.

## PixWeft showcase and workflow update

The updated configured Node suite passed **12 tests, zero failures, zero skips**,
including real Godot input and rendered captures. The original Pixelorama native
suite passed **18 commands** and its stdio MCP image/receipt checks. Focused
native validation passed **26 commands** for sheet import, FPS, exact RGBA,
bounded detail previews, and opening a source from an empty document.

Each of the **ten final showcase PXO files** opened in a separate fresh private
Pixelorama process and reproduced its public PNG sheet as identical decoded
RGBA. Public export-path metadata was cleared without changing non-metadata ZIP
payloads. Final source hashes and this bounded evidence are in the
[source verification record](../examples/showcase/sources/source-verification.json).

The final sheets were imported into Godot with nearest filtering. Stdio MCP
measurements and rendered playback observed all source frames for all ten
animations. A real capture, current asset hashes, timings, production methods,
and limitations are in [the showcase](../examples/showcase/README.md). Palette,
canvas, action, and subject choices stay inside that example. Pixelorama detail
inspection and actual repairs to the office worker's eyes demonstrate the
review-and-repair path; numeric measurements alone did not resolve that issue.
