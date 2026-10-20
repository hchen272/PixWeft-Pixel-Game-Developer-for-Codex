---
name: godot-scenes
description: Create and repair Godot 2D levels and scene composition using TileMaps, freely placed objects, layered backgrounds, reusable modules, or mixed approaches. Use for layout, collision, navigation, occlusion, and camera integration.
---

# Godot Scenes

Inspect the scene tree, project resources, movement model, and current layout before editing. Read [scene strategies](../../shared/references/scene-strategies.md) for the relevant construction method. Keep projection, content organization, movement grid, and physical height as separate design choices.

Choose the smallest suitable edit. Preserve a working construction method unless the task requires changing it. TileMap is optional: freely placed scene instances, layered backgrounds, reusable modules, and mixed scenes are equally valid. Do not force independent objects or a whole background into a tile atlas.

Route all newly generated scene images, including buildings, decorations, backgrounds, props, and tiles, through [pixel-art](../pixel-art/SKILL.md): ask once for style reference images when none have been supplied and availability has not been answered, then generate -> directly import into Pixelorama. Animated scene artwork starts with a multi-frame reference sprite sheet. Preserve imported pixels by default; inspection findings do not automatically trigger artwork edits. This workflow applies independently of the scene's construction method.

Separate visual placement from collision, navigation, interaction, and any height model. A painted doorway or bridge does not create playable behavior. Use stable anchors and inspect overlapping shapes and depth relationships in the actual camera view. For project-specific tile APIs and coordinates, consult documentation matching the installed Godot version.

Use native operations that the connected tools actually expose; ordinary resource or scene edits can use Codex file tools. Inspect the result after mutation. Preserve shared resource semantics and avoid unintentionally changing every instance through one shared resource.

Validate the affected route or area with real movement, relevant interaction, camera bounds, and occlusion. For tiles, test adjacency and variant combinations. For free placement, test overlap and anchors. For backgrounds, test playable coverage and foreground masks. Use [review methods](../../shared/references/review-methods.md) for a reported defect.

Return changed scenes/resources, tested locations, current evidence, and remaining issues. Do not claim whole-level completion from a single camera capture.
