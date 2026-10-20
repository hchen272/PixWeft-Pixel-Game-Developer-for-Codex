# Scene construction choices

Select by the existing project and requested edit. Projection, construction method, movement model, and optional elevation are independent choices. A scene can mix methods.

| Method | Useful properties | Main integration checks |
| --- | --- | --- |
| TileMap layers | Repeated terrain, grid-driven editing, terrain/variant rules | Coordinates, atlas regions, adjacency, collisions, variant distribution |
| Freely placed scene instances | Independent props, authored placement, reusable behavior | Anchors, overlap, depth, shared resources, collision shapes |
| Whole or layered backgrounds | Authored compositions, compact environments, parallax | Camera coverage, walkable geometry, foreground masks, interaction alignment |
| Reusable modules | Rooms, platforms, structures, connected sections | Connection points, transforms, continuity, duplicated state |
| Mixed approach | Different methods where each is useful | Scale consistency and clear ownership across method boundaries |

## Tile-driven work

Inspect the actual TileSet shape, layout, tile size, atlas source, origins, and terrain model. Consult Godot documentation for the installed version when coordinate or terrain behavior is uncertain. Use tile probabilities or alternative tiles when the chosen workflow supports them; do not assume runtime random drawing is the same as editor painting.

Separate seamless base material variants from edge/transition variants. Test legal neighboring combinations and long runs, not only a curated sample. Use the adjacency model appropriate to the project: edge masks, corner rules, dual-grid data, authored connections, or another explicit model. Road width follows playable intent and scale. Transition art can live in a tile, a separate overlay, or another chosen method.

## Freely placed and modular work

Give reusable objects a consistent origin and contact footprint. Keep interaction and collision shapes separate from visual overhang. Check placement behind and in front of the player from relevant approaches. Resource edits may affect all instances; use intentional sharing or local copies.

## Background-driven work

A painted passage does not define traversal. Build collision, navigation, interaction zones, and any foreground occlusion needed by the game. Inspect playable coverage at camera limits and relevant display sizes. Split the art into layers when the intended depth or motion needs it, not merely to imitate a tile workflow.

## Elevation and occlusion, when needed

Express height as project data and reachable connections, separately from visual vertical offsets. Check continuity where surfaces meet and whether unrelated overhangs hide those joins. A screenshot seam may originate in neighboring geometry, not the visible slope artwork.

Choose depth ordering that matches the projection and scene, then verify player movement through overlaps. Use diagnostic renders, temporary object identifiers, or isolated layers to locate ambiguity. Keep diagnostic helpers out of the delivered game. Recheck real art and normal rendering after diagnostics.

Official Godot entry points: [scene instancing](https://docs.godotengine.org/en/4.6/tutorials/scripting/nodes_and_scene_instances.html), [TileMaps](https://docs.godotengine.org/en/4.6/tutorials/2d/using_tilemaps.html), and [2D navigation](https://docs.godotengine.org/en/4.6/tutorials/navigation/navigation_introduction_2d.html). Verify the installed minor version and relevant API before applying an example.
