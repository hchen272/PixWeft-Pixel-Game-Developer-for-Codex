# UI artwork and states

Determine the interface task and information hierarchy before requesting art. Use editable runtime text unless baked lettering is intentional.

```text
Interface purpose: [player task].
Visual direction and references: [adopted style, each reference's role].
Components: [panel, control, icon, illustration, or other needed parts].
States: [normal, selected, hover, pressed, disabled, etc. as needed].
Logical sizes and display range: [chosen targets].
Protected areas: [corners, borders, ornaments].
Stretch/repeat regions: [when nine-patch or tiling is appropriate].
Content areas: [empty space for text, values, icons, and illustrations].
Readability requirements: [hierarchy and differentiation].
Deliver components separately where independent layout or animation is needed.
Background/alpha, padding, and source layers: [per component].
```

Use [image production](../references/image-production.md) for every generated UI image. Ask once whether style reference images are available before generation when none have been supplied or adopted and availability is unanswered, even with a written style description. Reuse previous answers; references are optional. Generate -> directly import into Pixelorama without proactive pixel changes. Animated image components start with a multi-frame reference sprite sheet imported as editable frames. Inspect and report findings without triggering repair; explicitly requested cleanup, native editing, and redraw remain supported. Preserve the project's chosen rendering style; the same process applies to non-pixel portraits or illustrations used in a mixed-media UI.

Review at intended display sizes and with real content. Check state differences, stretch artifacts, icon clarity, clipping, and legibility. A complete UI mockup is a reference, not an implementation of layouts, hit areas, focus, or animated transitions.
