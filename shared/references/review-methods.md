# Evidence-led review and repair

## Choose a claim and its observation

| Claim | Suitable observation |
| --- | --- |
| Asset matches file specifications | Actual dimensions, alpha, frame layout, or palette analysis |
| Artwork is complete and coherent | Visual inspection of source and export at useful scales |
| Animation plays correctly | All relevant frames and a complete runtime loop or transition |
| Scene integration works | Real camera captures plus movement, interaction, and relevant state |
| A rule is implemented | Focused state assertions or simulation with defined semantics |
| A player can complete a flow | Real input through the intended entry path |
| A build is usable | Launch and representative play in the exported artifact |
| The experience is enjoyable | Player feedback and a clearly described playtest scope |

Do not substitute one observation for another. Not all tasks need every layer.

## Reproduce before revising

Identify the current artifact and the conditions shown in the report. Compare source art, export, import/filter settings, placement, and runtime rendering as needed. For a visual seam, isolate candidate layers or objects. For an interaction failure, trace input, hit testing, state, and feedback. Change the component implicated by evidence rather than redrawing first.

For screenshot feedback, retain the location and camera conditions. If exact reproduction is impossible, describe the closest observation and uncertainty. Inspect a continuous area or motion when the defect appears between adjacent states.

For animated joints or layered moving parts, inspect a magnified contact crop in every pose as well as the complete played sequence. Check attachment width, overlapping contours, material boundaries, and the visible transition into the stationary part. Alpha connectivity alone can pass a one-pixel bridge or an unrelated overlap while the joint still looks fractured. Treat it as a narrow measurement, not approval of the joint's geometry or appearance. Extremes alone may miss a broken intermediate pose.

Review motion in causal order: preparation, displacement or impact, contact, recovery, and the return to the first frame where relevant. Check whether feet, wings, limbs, equipment, and secondary motion follow the intended action rather than merely changing pixels. Inspect the loop boundary at the intended speed and slow enough to understand the contacts. A frame counter, distinct-frame count, or successful playback cannot establish convincing movement.

## Record an actionable issue

Use a short entry containing: impact, reproduction steps, expected behavior, observed behavior, revision, evidence, likely affected components, and repair status. Separate observations from hypotheses.

A repair check repeats the original failing condition, then examines adjacent conditions that the change could affect. Keep thresholds and expected behavior stable unless their correction is justified explicitly. A missing capability or inaccessible target is `blocked` or `not_run`, not a pass.

When a visual defect needs a regression check, record the asset revision, relevant frames and crop, and the specific expected contact or contour. Use project-specific landmarks or reviewed masks only when they express that expectation; keep their scope explicit. Preserve the failing example where useful, and ensure the focused check detects it. Do not convert a local mask, connectivity result, or reviewer judgment into a universal artwork quality score.

## Independent review

Delegate only when it improves confidence. Give the reviewer the user's requirement, allowed scope, and raw artifacts. Avoid telling the reviewer what verdict or fix to find. An independent review may identify no issue; it must still state what was actually examined.

Keep review and implementation ownership clear. A reviewer should not quietly modify the criteria or the deliverable while forming its verdict. The default generated-art direct-import route preserves pixels: inspection reports defects without starting native repairs. When the user requests a fix, the owner can apply the scoped change and submit the changed revision for focused re-review.

## Completion

Tie the result to the checked files or build. Preserve incomplete findings and capability limits. If upstream files change, mark dependent evidence stale and rerun the relevant observation. Summarize actual outcomes without claiming whole-game quality from a local check.
