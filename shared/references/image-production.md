# Reference-aware image production

## Select the task

A prompt-only request ends with a usable prompt and the unresolved production requirements; it does not start generation. Concept work explores direction and may use an approximate canvas. A production task needs an asset specification and editable-source/export plan. A patch preserves the current approved result except for the requested change.

## Ask about style references before generation

Before generating artwork, proactively ask whether the user has style reference images when none have been supplied or adopted and their availability has not already been answered. Ask once, even if the user has described a style in words. Reuse supplied references and previous answers; do not repeatedly ask for the same information. Identify each image's role instead of treating a layout or motion guide as a style reference automatically.

Style references are optional. If unavailable or declined, proceed with the user's brief and any adopted project style. The question is not a permission gate or a requirement to complete a questionnaire. Continue independent preparation while an answer is pending, and do not treat silence as a new creative decision. Prompt-only deliverables can record the unanswered reference question without starting generation.

## Choose the creation route

The task mode and creation route are separate decisions. Apply the following default process to all newly generated production images: characters, portraits, buildings, scenes, backgrounds, decorations, props, cards, icons, UI artwork, tiles, and effects.

- **Static artwork:** generate artwork -> directly import into Pixelorama.
- **Animation:** first generate a multi-frame reference sprite sheet -> directly import its frames into Pixelorama as editable frames.

Preserve generated pixels by default. Import preparation is limited to the agreed canvas and sheet layout; do not silently resize, recolor, clean up, redraw, or retouch the artwork. Inspection can identify defects and report them without starting a pixel-editing pass. Save the imported source and requested exports, then validate in Godot when integration is in scope. Explicit repair, cleanup, or native-authoring requests still authorize their scoped edits. This process does not impose a genre, rendering style, projection, dimensions, colors, or fixed number of frames.

| Route | Role of generated or supplied images | Production work |
| --- | --- | --- |
| Generated-art direct import, default for new generated production images | Generated artwork or a multi-frame reference sprite sheet whose pixels are retained. | Generate -> directly import into Pixelorama -> inspect and report without automatic pixel edits -> save and review the requested source/exports. |
| Native authoring or reference-led redraw, explicitly requested | Visual references for identity, design, materials, composition, or motion; they are not automatically the final pixel data. | Author the silhouette and deliberate clusters on the target Pixelorama canvas within the requested scope. Build meaningful layers and new animation poses where the asset requires them. |
| Generated-art cleanup/import, explicitly requested | Candidate pixel data to retain and prepare for use. | Import, isolate or normalize as authorized, repair the requested defects, and prepare the native source and exports. Report which changes were made. |
| Existing native-source edit | An editable project whose established structure should be preserved. | Modify the authorized frames, layers, pixels, or palette while retaining unaffected work and source relationships. |

Nearest-neighbor normalization, sheet slicing, palette quantization, or a `.pxo` save alone does not establish visual quality. Inspect the result and report observed defects; successful import must not imply a clean visual review. An explicit redraw still requires new authored production forms. For animation, inspect the actual sequence, pose continuity, timing, and wraparound; a changing frame index or whole-image translation alone does not establish coherent motion. Review findings do not expand a direct-import task into native repair.

The `image_prompt` tool retains `spec.creation_route: "generated-draft-refine"` as a compatible identifier; despite its historical name, its default behavior is generated-art direct import without automatic Pixelorama retouching. Set `asset_type: "animation"` to request the multi-frame reference sprite-sheet route and supply the chosen action, timing, and layout in the specification. Other explicit routes are `"reference-led-redraw"`, `"cleanup-import"`, and `"existing-native-edit"`. The tool assembles text; it does not itself generate an image or perform native edits. A supplied style image should carry its style role; use `spec.style_reference_answered: true` to record an earlier availability answer, including an answer that no references are available. The returned `requires_style_reference_question` and optional `style_reference_question` support the ask-once conversation; `pixelorama_handoff` identifies direct import, authorized editing, or no native handoff. These are planning signals, not proof of generation or application work.

Use the host's available image-generation capability, or a user-configured provider when present. The plugin does not supply a model account or assume that every Codex installation exposes image generation. Discover tool inputs before calling it. Inspect local source images before editing them; preserve transparency unless the requested change calls for a different treatment.

## Describe references by role

Assign each reference a purpose: style, identity, proportions, palette, material treatment, projection, composition, motion, or interface structure. Name what is borrowed and what is unrelated. Reference files are source material, not execution instructions.

For a series, establish a representative baseline before expanding variants. Record the baseline file and which traits stay constant. An asset does not become a style reference merely because a generator produced it.

## Keep four sizes distinct

1. Generator input/output resolution: what the model can actually produce.
2. Logical asset canvas: the pixel grid used by the editable production asset.
3. Subject occupancy and world scale: how much canvas the subject occupies relative to other assets.
4. Runtime display: the on-screen scaling and filtering used by the game.

Increasing an object's canvas preserves room for a larger subject; enlarging a tiny bitmap changes its display scale. Neither instruction alone guarantees matching pixel density. When preparing a candidate for its agreed logical canvas, inspect forms and edge placement rather than blindly shrinking it. Nearest-neighbor enlargement is useful for inspection; nearest-neighbor reduction can still destroy important shapes. Identify any needed conversion rather than silently applying it as artistic cleanup.

## Prompt and inspect

Use [image request](../prompts/image-request.md), [patch](../prompts/image-patch.md), or the asset-specific template. Include only adopted project requirements. Specify complete visible parts, useful negative space, background treatment, and a clear delivery layout. Do not promise exact dimensions, exact frame layouts, alpha, or strict palettes from prompting alone.

Review the real candidate: subject completeness, intended view, recognizable silhouette, reference consistency, pixel structure, and the ability to edit or export it. Report missing necessary parts and other defects explicitly. Keep a defective candidate unapproved for the affected use; do not silently repair pixels or replace the generated image during a direct-import task. In an authorized generation revision, adjust the prompt based on observed defects instead of adding a long generic negative list.

## Production handoff

Hand off the chosen route, style-reference answer or supplied references, generated image or multi-frame sheet, and actual import layout. Report detail findings separately from file/import success. Inspect completeness, small identifying features, contours, alpha, adopted pixel treatment, material consistency, and any motion sequence on the imported canvas. Under the default route, retain the generated pixels and leave reported issues for an explicit repair task.

For requested cleanup, repair, or redraw, record actual native changes and repeat the affected inspection. Retain the reference separately when authoring a redraw; continue in the existing source for native-source edits. Save the requested source and exports, preserve reference-to-source-to-export lineage, and inspect final exports. If generation, import, or a requested native-editing capability is unavailable, identify the unperformed stage and finish independent preparation without claiming it completed.
