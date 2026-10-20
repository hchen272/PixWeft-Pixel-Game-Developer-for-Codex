# Tile and transition artwork

Use only when the project uses tile-driven content. Read the actual grid and adjacency specification; do not assume a perspective or a particular terrain system.

```text
Produce [material / transition / modular tile family] for [intended use].
Grid and logical dimensions: [chosen shape, layout, size, origin].
View and scale reference: [adopted project choices].
Connection model: [which edges/corners must match, masks, overlays, or modules].
Variant roles: [clean base, sparse detail, concentrated detail, transitions].
Keep connection-compatible boundaries consistent.
Vary interior shapes and detail distribution enough to avoid repeated motifs,
while preserving material identity and game readability.
Surface and any visible side requirements: [only when relevant].
Palette and shading: [adopted requirements].
Delivery: [required atlas or separate assets, with padding if applicable].
```

Generated tile artwork follows [image production](../references/image-production.md). Before generation, ask once about style reference images when none have been supplied or adopted and availability is unanswered, even with a written style brief. Reuse previous answers; references are optional. Generate -> directly import into Pixelorama, preserving generated pixels. Animated tiles start with a multi-frame reference sprite sheet imported as editable frames. Inspect and report findings without automatically modifying pixels. Explicit native repair, cleanup, and authoring retain their scoped edits.

Review legal adjacent pairs, representative junctions, and long randomized areas. Keep detail probability or weighting separate from the pixels. Do not call a generated demonstration board a ready-to-use atlas without validating its cells and boundaries.
