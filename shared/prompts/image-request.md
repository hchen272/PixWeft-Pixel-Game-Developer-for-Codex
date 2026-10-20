# Image request prompt

Use this as a composition aid, not a form the user must complete. Omit unknown or irrelevant fields. Consult the project's visual profile and inspect references first. Before generation, proactively ask once whether the user has style reference images if none have been supplied or adopted and availability is unanswered, including when a written style description exists. Reuse earlier answers. References are optional; when unavailable or declined, use the brief and adopted project style.

```text
Task: [concept exploration / production candidate]
Creation route: [generated-draft-refine by default / reference-led-redraw / cleanup-import / existing-native-edit]
Generated image role: [artwork to import directly into Pixelorama without automatic pixel edits / reference for explicitly requested redraw / maintenance target]
Style reference availability: [supplied or adopted images / already answered unavailable or declined / ask once before generation]
Asset purpose: [how it will be used in the game]
Subject and necessary visible parts: [complete forms and identifying details]
Reference roles:
- [reference]: use for [identity / palette / proportion / composition / other]
- Preserve [specific traits]; unrelated content in references is not required.
View and composition: [adopted projection, orientation, framing, negative space]
Scale: target logical canvas [if chosen]; subject occupies [if chosen];
match [approved scale reference]. Generator output size is a separate setting.
Pixel treatment: [project's adopted cluster, outline, shading, palette requirements]
Background and edges: [opaque or transparent as needed; contact and padding]
Requested output: [single asset / candidates / exact intended arrangement]
This iteration changes: [specific intent]
```

For every newly generated production image, use generation -> direct Pixelorama import. This includes UI, portraits, cards, scene art, and other image assets. Preserve generated pixels by default. Inspect the imported canvas for completeness, identifying details, contours, material consistency, alpha, and adopted pixel treatment, then report findings without automatically changing pixels. Saving/importing establishes the handoff, not visual approval. Native repair, cleanup, or redraw occurs only within an explicitly requested editing scope, with actual changes and reinspection recorded.

For animation, use [the animation template](animation.md): first generate a multi-frame reference sprite sheet, then directly import its editable frames into Pixelorama. Review individual details and the sequence without automatic repairs. Concept and prompt-only requests remain within their requested scope; existing-native edits preserve the current source.
