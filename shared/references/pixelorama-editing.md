# Pixelorama source editing and export

The development baseline is Pixelorama 1.1.10-stable with Extensions API 8. The connected bridge's actual capabilities still need inspection; a documented baseline does not prove that every operation is installed or working.

## Before editing

Identify the active document, canvas dimensions, frame, layer, and current source path. Use stable document or layer identifiers when available. For an existing source, preserve a recoverable version and use native undo when supported. Creating a new canvas is not part of every edit.

After opening a native source, refresh document information before the next guarded mutation/export; deferred application updates can make the open response revision stale. Resolve conflicts by inspecting the current document. When adding layers, inspect actual order rather than assuming repeated insertions append to the top.

Set the logical canvas and source layout from the asset specification. Do not inherit a tool's example palette, canvas size, frame count, or background. Transparent cutouts and opaque backgrounds have different requirements. Read the actual alpha channel rather than inferring it from a checkerboard preview.

Confirm the creation route from [image production](image-production.md), including its ask-once style-reference check before generation. Default generated production images follow generation -> direct Pixelorama import without proactive pixel modification. For animation, generate a multi-frame reference sprite sheet and import its actual frames as editable frames. Apply this to scene, building, prop, portrait, card, icon, UI, tile, effect, and character art alike. Inspect and report issues without silently starting cleanup or redraw. Native authoring, cleanup, and repairs remain available when explicitly requested; existing-source edits retain their structure and scope without unnecessary regeneration.

## Make deliberate pixel edits when requested

Plan major shape or frame changes before sending many small tool calls. Batch drawing when supported, while honoring actual payload and application limits. Check every mutation response; stop dependent work on failure and inspect state after a timeout. Do not mistake a drawing-plan response for generated artwork.

Use layers according to future edits: a flat raster imported into a source document remains flat until separated. Preserve forms and material boundaries when reducing colors. A palette count alone cannot distinguish deliberate clusters from noisy automatic quantization. Procedural operations are useful when the task calls for them, not a universal substitute for authored forms.

When the task explicitly includes native repair, cleanup, or authoring, inspect the actual canvas and apply the scoped pixel, contour, feature, material, or frame corrections through supported native operations or the application UI. Preview the same region or sequence again and record actual changes and reinspection. For a default generation/import task, report findings without modifying pixels. An external transformation followed by import is input preparation, not evidence of in-application pixel editing.

`document.import_sheet` provides explicit slicing and nearest-neighbor normalization, including single-image import. Its successful native round trip establishes pixel transport and editability for those operations; it does not establish that a redraw was authored, that layers are useful, or that an animation is coherent.

## Review

Inspect native-size and integer-magnified views. Look for broken contours, inconsistent pixel scales, unwanted intermediate alpha, isolated noise, missing parts, and loss of important detail. Assess these against the project's chosen treatment of antialiasing and transparency. Inspection reports defects; it does not authorize pixel changes to a direct import.

For animation, inspect every frame and play the complete cycle. Check proportion, identity, important equipment, anchor drift, contact, timing, and transitions. A changing frame index proves playback, not coherent motion.

For variants or tiles, assemble representative combinations and inspect the result. Strong local texture can become distracting repetition in a large area.

## Save and export

Save the editable source, verify its path and current contents, then export the required runtime files. Preserve frame order, duration, loop flags, anchors, and atlas regions where applicable. Query or reopen exported results when useful, and compare their visible contents with the source.

For sources intended for sharing, inspect stored export locations and other machine-specific metadata. If cleanup is needed, preserve a backup, limit it to the identified metadata, and verify that the artwork payload and a fresh native re-export remain unchanged. A successful save does not establish portable source metadata.

Keep evidence for the export that Godot actually imports. Source screenshots, export screenshots, editor previews, and runtime captures are distinct observations. Report which ones were inspected. Do not assume that a successful save or import fixed any visual defect.
