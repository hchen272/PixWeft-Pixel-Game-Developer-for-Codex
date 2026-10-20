---
name: pixel-art
description: Plan and produce pixel game artwork using reference-aware image prompts and Pixelorama import, including sprites, animation, scene assets, tiles, and UI art. Also supports prompt-only requests and scoped edits to existing artwork.
---

# Pixel Art

Choose the requested mode: prompt only, concept exploration, production asset, local patch, animation, or review. Inspect supplied references and existing source art. Preserve project choices; canvas sizes, perspective, palette limits, directions, and frame counts are asset-specific.

Before generating, proactively ask whether the user has style reference images if none have been supplied and their availability has not already been answered. A written style description does not replace that question. Reuse supplied references and earlier answers instead of asking again. If references are unavailable or declined, proceed from the user's brief or adopted project style; references are optional.

Use these default workflows for every newly generated game image, including scene assets, portraits, cards, icons, and UI artwork:

- **Static assets:** generate artwork -> directly import into Pixelorama.
- **Animation:** generate a multi-frame reference sprite sheet -> directly import its frames into Pixelorama.

Preserve the generated pixels on import. Use the agreed canvas and frame settings, inspect the imported document and animation when applicable, and report visible issues. Do not proactively redraw, clean up, recolor, retouch, or otherwise alter pixels after import. Import and source/export delivery can complete this handoff; no token edit is required. Findings do not automatically authorize repairs.

When the user requests corrections, native authoring, or cleanup, edit the relevant source in Pixelorama through supported native operations or its UI, then recheck the changed details or sequence. Preserve unrelated artwork and continue existing-source repairs without unnecessary regeneration. When preparing an image_prompt for an existing native-source repair, set spec.creation_route to "existing-native-edit"; patch mode alone describes a generated patch. A single static image is not a multi-frame animation reference.

Read [image production](../../shared/references/image-production.md) for generation or editing prompts, [Pixelorama editing](../../shared/references/pixelorama-editing.md) for native source work, and only the matching prompt template:

- [Image request](../../shared/prompts/image-request.md), [local patch](../../shared/prompts/image-patch.md), or [asset review](../../shared/prompts/asset-review.md).
- [Animation](../../shared/prompts/animation.md), [tiles](../../shared/prompts/tiles.md), [scene kit](../../shared/prompts/scene-kit.md), or [UI kit](../../shared/prompts/ui-kit.md) when applicable.

Separate generated input resolution, target logical canvas, subject occupancy, and runtime display size. Discover whether image generation is actually available. If it is absent, continue with prompt preparation, existing assets, or native editing as authorized; do not pretend an image was generated. Preserve the user's chosen creation method.

Save the editable source and requested exports, record their relationship, and inspect the export at native size, an integer magnification, and its intended game scale when possible. Check relevant animation loops or asset combinations. Distinguish import completion from visual review findings; return actual results and unresolved defects using [shared contracts](../../shared/contracts.md).
