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

## Running checks

```powershell
npm run validate
npm test
```

Portable Node tests run without Godot or Pixelorama. Native integration tests
require explicit local application paths; see the
[integration lab](../examples/neutral-lab/README.md) and the
[Pixelorama native checks](pixelorama.md#native-verification).

Local reports and isolated application profiles stay in ignored `.local/`
directories. Check the current files and environment when reproducing a result.
