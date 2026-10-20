# Shared project and task contracts

Read only the sections needed for the current task. These are interchange conventions, not a requirement to create every record for a small edit.

## Project context

Use `.pixel-game/project.json` for machine-readable project configuration with `schema_version: 1`. Put machine executable paths, local bridge URLs, and optional tokens in the ignored `.pixel-game/project.local.json` override or environment variables. Keep credentials and machine paths out of shared examples and version control. Resolve `project_root` before operating on files or a live application.

Creative settings are project-owned. Read existing documents first and preserve the project's structure. When useful, keep concise notes under `.pixel-game/` or link to established project documents:

- **Brief:** intended experience, current scope, next playable target.
- **Decisions:** `decided`, `assumed`, or `open`, with the reason and source. An assumption is provisional; do not attribute it to the user.
- **Visual profile:** only adopted choices, such as projection, logical canvas sizes, scale relationships, palette, outlines, animation conventions, and display treatment.
- **Asset index:** creation route, reference or generated candidate, editable source, runtime export, importing resource, and revision relationship.
- **Evidence:** task-specific observations, reproduction steps, artifacts, and limitations.

Unknown visual fields remain unspecified. A new task does not inherit another game's settings. A planning request authorizes discussion and preparation, not automatic implementation.

## Task handoff

Provide a short handoff when work crosses a skill, agent, or tool boundary:

```text
Goal and scope:
Project and current revision:
Relevant decisions / provisional assumptions:
Inputs and their roles:
Creation route when relevant:
Owned files or live document:
Requested output:
Checks relevant to this change:
Restrictions and out-of-scope work:
```

The receiving skill may use tools or delegate when available. Reading a skill's instructions is ordinary routing; there is no assumed nested-Skill API. A leaf skill returns its results to the caller instead of recursively routing back to the coordinator.

## Asset request

Capture the following when they affect the result: asset type and use, creation route, approved references and their individual roles, content and completeness requirements, projection, target logical canvas, subject occupancy, scale reference, generated input size, pixel treatment, alpha treatment, editable source, export layout, anchor, and relevant review scenes. Distinguish generated-art direct import, explicitly requested native redraw, cleanup/import, and an existing native-source edit. A generated candidate needs review before approval; resizing or importing alone is not quality evidence and does not meet an explicit redraw request.

Before generation, proactively ask once whether style reference images are available when none have been supplied or adopted and availability has not already been answered, even if a written style brief exists. Reuse existing references or answers. References are optional; when unavailable or declined, continue with the brief and adopted project style without a questionnaire or permission gate. New static artwork follows generation -> direct Pixelorama import; new animation starts with a multi-frame reference sprite sheet -> direct import as editable frames. Preserve generated pixels by default. Inspection reports issues without automatically triggering native pixel adjustments. Handoffs identify the style-reference status, generated image, imported document, observed defects, and requested exports. Explicit native-authoring, cleanup, and repair scopes retain their actual editing and reinspection steps; these process defaults do not supply creative settings.

For animations, add directions, actions, timing, frame order, and looping semantics that the project actually requires. For tiles, add the chosen grid and adjacency model. For backgrounds, add playable coverage and layer needs. For UI, add supported sizes, states, stretch regions, and text placement. Do not fill unrelated fields with invented defaults.

## Result and evidence

Return changed files or live documents, actual tool outcomes, checks performed, remaining issues, and the next useful step. Distinguish `passed`, `failed`, `not_run`, and `blocked` at the check level; a successful export is not an aesthetic approval or a successful playtest.

Associate evidence with the revision of the relevant scene, asset, configuration, or build. Use a content hash when convenient, otherwise identify the files and capture time precisely enough to reproduce the observation. Upstream changes make dependent observations stale; rerun the affected checks rather than silently reusing old approval.

A useful issue includes reproduction conditions, expected and observed behavior, evidence location, severity, implicated resources, and the status of the repair. Preserve the acceptance criterion while repairing the implementation. Revisit a criterion only for a documented reason; do not silently relax it to obtain a pass.

## Live-edit ownership

Identify the active project and document before mutation. Assign one writer to a live document or shared scene at a time. A timed-out mutation has an unknown outcome until state is queried; avoid blindly repeating it. Stop a dependent sequence on partial failure, report completed changes, and inspect the resulting state before continuing.
