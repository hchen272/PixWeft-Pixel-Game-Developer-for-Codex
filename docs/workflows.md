# Workflows

The coordinator chooses only the capabilities needed by the user's request. Each specialist can also be invoked directly. New generated images use the image-production workflow below; discussion, review, and existing-source repairs retain their own scope.

## Discuss an idea

`pixweft -> game-design`

Identify the intended experience and one consequential uncertainty. Compare concrete options, record adopted choices and provisional assumptions, and define a small playable experiment. If the user asked only to discuss, stop with the plan.

## Build a playable increment

`pixweft -> game-design (if needed) -> godot-gameplay / godot-scenes / game-ui -> game-review`

Inspect the existing project, implement a complete interaction, and verify it through real input when supported. Use clearly identified temporary assets if appropriate. Replace them through `pixel-art` when the task calls for production art. A code compile or scene import is not proof of playability.

## Create or repair artwork

Before new image generation, ask whether the user has style reference images unless they have already supplied them or answered about availability. A written style description does not replace this question. Reuse the answer across related work; optional references do not become a questionnaire or a generation prerequisite. If none are available, continue from the brief or adopted project style.

For every newly generated production image, including characters, portraits, buildings, scenes, decorations, props, cards, icons, UI, tiles, backgrounds, and effects:

- **Static artwork:** generate an image -> directly import into Pixelorama.
- **Animation:** generate a multi-frame reference sprite sheet -> import its editable frames into Pixelorama.

Keep generated pixels as imported by default. Inspect the imported document and animation when relevant, report findings, and save the requested source and exports. Do not proactively modify pixels, redraw, clean up, or perform palette conversions. Import completion and review findings are distinct parts of the handoff.

When the user requests a repair, cleanup, or native authoring, edit the relevant canvas in Pixelorama through supported native operations or its UI, then recheck the affected details or motion. Existing-source repairs continue from the current document without unnecessary regeneration.

Keep reference roles, generator size, logical canvas, subject scale, and runtime display distinct. The process imposes no style, perspective, dimensions, palette, or frame count. Prompt-only and concept requests retain their scope. See [image production](../shared/references/image-production.md) for creation routes. Image generation uses an available host tool or configured provider. For `image_prompt`, use `asset_type: "animation"` for the multi-frame sheet route.

## Build a scene without TileMap

`godot-scenes -> pixel-art (as needed) -> godot-gameplay (as needed) -> game-review`

Inspect the chosen construction method. Place independent instances, background layers, modules, or a mixture. Establish collision, navigation, interaction, and depth independently from art. Test traversable routes, camera coverage, overlap, and relevant actions. A grid is not required.

## Repair screenshot feedback

`game-review -> owning production skill -> game-review`

Locate the reported condition in the current revision. Compare source art, export, import settings, placement, and runtime output to form a diagnosis. Change the implicated component, repeat the original observation, and inspect adjacent conditions. Do not redraw artwork to conceal an unrelated ordering or geometry defect.

## Deliver a build

`game-build`

Inspect presets and export prerequisites, export the requested target, and launch the packaged artifact where supported. Report the output, controls, observed checks, and limitations. Local build permission does not imply release publication.

## Resume after a new session

Read the current project, brief, decisions, relevant task records, and actual files. Check whether prior evidence still matches the current revision. Resume the next useful target without restarting completed discussion. User edits take precedence over stale generated summaries.

## Skill routing and implementation

The coordinator reads specialist instructions or delegates them through the host's available agent mechanism; there is no assumed nested-Skill API. Leaf skills can refer to another specialist for a genuine handoff, then return results to their caller. Shared records and references live outside skill folders and must remain packaged with them.

MCP operations expose actual local software capabilities. The host supplies reasoning, ordinary code editing, optional agents, and any available image generation. If native editing, screenshot, or input capabilities are absent, finish independent work and identify the exact unverified part.

## Available tool entrypoints

Discover each tool's current argument schema before use:

| Tool | Role |
| --- | --- |
| `project_init` | Establish project configuration without inventing creative settings |
| `project_inspect` | Read project configuration and local tool settings |
| `toolchain_doctor` | Diagnose executable, version, bridge, and capability availability |
| `image_prompt` | Assemble an English prompt/specification for an available host image tool; it does not generate images |
| `godot_operation` | Perform an allowed named Godot operation |
| `godot_runtime` | Run a bounded input, wait, inspect, or capture sequence when its runtime bridge is available |
| `pixelorama_operation` | Perform an allowed native edit against an identified document/revision |
| `run_status` | Query operation outcomes rather than blindly repeating a timed-out mutation |

The CLI exposes the same local entrypoints:

```text
node scripts/cli.mjs <tool> --project <project-root> --args <arguments-json-file>
node scripts/cli.mjs doctor --project <project-root>
```

Use a JSON argument file to avoid shell quoting problems. The full invocation should use the plugin's actual script path when the current directory is elsewhere. Put machine-specific settings in `.pixel-game/project.local.json`. Environment overrides include `GODOT_PATH`, `PIXELORAMA_PATH`, `PIXEL_GAME_PIXELORAMA_URL`, and `PIXEL_GAME_PIXELORAMA_TOKEN`. Do not place secrets in prompts, handoffs, or reports.

## Source of the workflow approach

The discussion, decision summaries, pressure testing, and independent re-review structure are inspired by [academic-research-skills](https://github.com/Imbad0202/academic-research-skills) and its [Codex adaptation](https://github.com/Imbad0202/academic-research-skills-codex). These game workflows are newly authored for this plugin. They do not inherit academic constraints, fixed discussion rounds, project-specific game settings, or a universal approval sequence.
