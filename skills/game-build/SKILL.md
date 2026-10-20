---
name: game-build
description: Prepare, export, and verify Godot game builds with concise delivery notes. Use for packaging or build failures; publishing and uploading require the user's authorized scope.
---

# Game Build

Inspect the project version, export presets, installed templates, target platform, and current playable state. Confirm the delivery target when it cannot be inferred. Do not silently change platforms, install large dependencies, or publish externally as part of a local build request.

Check the main scene, resource imports, required assets, and relevant project settings. Keep development-only helpers, credentials, machine paths, temporary evidence, and private reference material out of the deliverable. Follow existing project export rules where available.

Export through the installed Godot capabilities and capture its real exit status and output. Inspect the artifact that was produced; a requested output path does not prove a valid build. If the export environment is incomplete, identify the missing prerequisite and complete unaffected preparation.

Launch the packaged build when the environment supports its target, then verify startup, a representative playable path, and exit. Editor execution is separate evidence from packaged execution. State clearly when cross-platform output could only be exported and not run locally.

Deliver the artifact location, platform, source revision, tools used, actual build/startup checks, controls needed to begin, and known issues. Keep the report short enough for a new player to use. Use [shared contracts](../../shared/contracts.md) for evidence and project handoff. Uploading, release creation, and distribution are separate actions unless already authorized.
