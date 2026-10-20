# Local image patch prompt

For a generated image patch, inspect the target before composing the request. Supply the exact approved target and relevant references through the image tool's real edit interface. Ask once whether style reference images are available if none have been supplied or adopted and availability is unanswered; a written description does not replace this optional question. Reuse prior answers and proceed with the brief or established style when references are unavailable or declined. For an existing native-source repair, continue directly in Pixelorama within the authorized frames/layers; generating a replacement and asking generation-only questions are not required. When using image_prompt for that repair, set spec.creation_route: "existing-native-edit". Mode "patch" alone prepares a generated patch, so naming a PXO in the subject does not select native editing.

```text
Edit the supplied asset for this specific defect: [observed issue].
Modify only: [region, object, frame, or layer and requested change].
Preserve: [identity, silhouette, proportions, palette, view, composition,
unaffected parts, transparency, and dimensions that actually need preservation].
Use reference [name] only for [specific role].
The corrected result should show: [concrete visible outcome].
Do not reinterpret unrelated content.
```

A request to preserve does not prove preservation. Compare the result with the approved input, inspect affected boundaries, and check the original defect. Report excessive generator drift rather than accepting it or silently starting a native repair. A requested revision can use native editing or a more localized generation operation within its authorized scope.

Directly import or merge only the authorized generated patch image/frame into Pixelorama, preserving the existing source's unaffected frames, layers, and pixels. Inspect the imported detail and recheck the defect and surrounding boundaries before saving/exporting. Report remaining issues without automatic extra pixel corrections. If the task explicitly includes native repair, cleanup, or authoring, perform only those scoped changes and record their reinspection. Import success establishes the handoff, not that the requested visual repair passed.
