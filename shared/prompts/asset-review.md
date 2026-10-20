# Asset review prompt

Use for an independent visual pass or your own structured inspection. Supply the requirement and real artifacts without a preferred verdict.

```text
Review this [asset type] for its intended use: [use].
Adopted project requirements: [relevant actual choices].
Creation route: [generated-art direct import / requested native redraw / cleanup-import / native-source edit].
Reference roles: [approved baseline and what each reference establishes].
Artifacts: [source, runtime export, native preview, magnified preview,
animation loop, or scene capture that is actually available].
Current revision: [identifier].
Review scope: [completeness / pixel treatment / consistency / integration / other].
Report observed defects with locations and impact, distinguish uncertainty,
and state what you could not inspect. Do not modify the artifacts.
```

Look for missing parts and broken forms as well as numerical compliance. For a requested redraw, inspect the actual authored source and final pixels; a saved or resized imported reference does not establish completion. For cleanup or an existing-source edit, review against that chosen scope rather than requiring a different creation method. Record a pass only for the scope examined. Report defects without automatically modifying generated/imported artwork. When repair is explicitly requested, use a production skill within that scope and repeat the original observation on the changed artifact.

Inspect important small features at appropriate integer magnification and at intended display scale, including faces, hands, equipment, or lettering when relevant. If an observed defect remains, identify it as unresolved rather than approving the asset on statistics or successful file operations. After repair, recheck the same detail and the surrounding form or animation.

Compare a local repair with the retained artwork: silhouette, edge weight, shading clusters, and material texture should remain coherent. A connected joint or correctly placed contact can still look pasted on or crudely geometric. Check the repaired boundary at native and intended display size, not only the isolated patch under high magnification.
