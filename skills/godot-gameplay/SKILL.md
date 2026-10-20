---
name: godot-gameplay
description: Implement and debug Godot gameplay code, input, rules, interactions, state transitions, and game data. Use for concrete mechanics or gameplay defects in new or existing projects.
---

# Godot Gameplay

Inspect the current scripts, scene connections, project inputs, data, and relevant decisions. Follow the project's established language and architecture; do not rewrite unrelated systems. Confirm installed capabilities before choosing version-specific APIs.

Express the requested behavior as a concrete trigger, state transition, feedback, and completion or cancellation condition. Resolve ambiguity that changes behavior; use documented provisional assumptions for routine choices. Keep game rules independent of visual effects where useful, while avoiding an unnecessary framework for a small mechanic.

Implement the smallest complete playable increment: real input, state changes, visible feedback, and an appropriate recovery path. Check references, signals, ownership, and lifecycle behavior. Treat scene resources and data as part of the implementation, not merely code dependencies.

Verify at the layer that can establish the claim. Use focused calculations or simulations for numerical rules, script or import checks for loadability, and actual runtime input for interaction. A state change injected by a test is not proof that the player can reach it. Identify such shortcuts and separately test the real entry path.

Run checks proportional to the change. Reuse existing meaningful tests; add one when it protects a real invariant or regression. Do not add tests that simply repeat implementation constants or force a pass by changing expected behavior.

Coordinate with scene, art, or UI work through [shared contracts](../../shared/contracts.md). Report the playable behavior, relevant validation, remaining integration needs, and any limitations of the runtime observation.
