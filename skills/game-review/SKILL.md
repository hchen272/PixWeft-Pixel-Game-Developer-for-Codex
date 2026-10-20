---
name: game-review
description: Review pixel game artwork, Godot scene integration, and playable behavior; reproduce defects and verify repairs with revision-bound evidence. Use for visual audits, playtests, screenshot feedback, and regression checks.
---

# Game Review

Inspect task-critical small details, such as faces, hands, equipment, lettering, and contact points, at a suitable integer magnification as well as final display scale. Report visible defects with their evidence. Review alone does not authorize pixel edits: when repair is requested, correct the affected details and repeat the same observation. Numerical checks, a valid source archive, or an export must not substitute for observing the result.

Establish the requested review scope and current revision. Read [review methods](../../shared/references/review-methods.md), and [asset review prompts](../../shared/prompts/asset-review.md) for art. Review only the relevant criteria; do not expand a local fix into a mandatory whole-project audit.

Inspect raw artifacts and actual results before relying on summaries. Distinguish file/specification checks, aesthetic observations, engine integration, runtime behavior, and player experience. Each supports different conclusions. Do not infer artistic completeness from a hash, or enjoyment from a successful simulation.

For screenshot feedback, identify the implicated area, inspect the source and scene, and reproduce the view when possible. Form hypotheses before altering assets. Separate an artwork defect from filtering, placement, occlusion, collision, and camera causes. Use targeted diagnostic captures when the visible result is ambiguous.

Record actionable issues with reproduction conditions, expected and observed behavior, evidence, severity, and affected resources. Preserve review criteria during repairs. An independently delegated reviewer should receive the requirement and raw artifacts without being coached toward a desired verdict.

When repair is authorized, return to the owning production skill or implement a scoped fix, then repeat the original observation and relevant adjacent checks. Mark stale evidence after dependent changes. If runtime or visual access is unavailable, report the limitation and finish independent checks without inventing results.

Return findings ordered by impact, actual checks and their outcomes, unresolved uncertainty, and the revision reviewed. Say explicitly when no issue was found within that scope.
