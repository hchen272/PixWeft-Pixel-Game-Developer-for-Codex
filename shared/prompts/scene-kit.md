# Scene asset kit prompt

Choose the construction method first. A scene kit can contain independent objects, reusable modules, background layers, or a mixture; tile output is optional.

```text
Scene purpose and playable use: [player activities and spatial needs].
Construction strategy: [free placement / modules / layered background / mixed].
View, lighting, scale, and baseline: [adopted project references].
Required deliverables:
- [object or layer]: [role, complete visible parts, footprint/contact, padding].
- [module if any]: [connection points and compatible dimensions].
- [background if any]: [camera coverage and foreground separation].
Keep [shared visual traits] consistent across the kit.
Variants should differ in [specific silhouettes or detail placement],
while keeping [scale and functional connection constraints].
Background/alpha and source organization: [per deliverable].
```

Apply [image production](../references/image-production.md) to each newly generated image, whether an independent building, decoration, background layer, or module. Ask once about style reference images before generation when none have been supplied or adopted and availability is unanswered, including with a written style brief. References are optional; reuse prior answers and the adopted project style. Generate -> directly import into Pixelorama, preserving generated pixels. Animated images start with a multi-frame reference sprite sheet imported as editable frames. Inspect and report findings without automatic pixel edits; explicit cleanup, repair, or native-authoring scopes remain available.

Check each deliverable separately for completeness, then assemble a representative scene. A composed preview does not replace the individual source assets needed for placement. Painted geometry still requires engine collision, navigation, and interaction data.
