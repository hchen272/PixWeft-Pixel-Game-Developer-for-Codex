---
name: game-ui
description: Design and implement Godot game interfaces, including image-based components, layout, interaction states, animation, focus, and responsive behavior. Use for UI creation or interface defects rather than general world-scene editing.
---

# Game UI

Inspect the player's task, existing interface, supported inputs, project visual profile, and display assumptions. Define the information hierarchy and interactions before producing art. Preserve the chosen art direction; pixel treatment, typography, and mixed-media choices remain project decisions.

For artwork, use [UI kit prompts](../../shared/prompts/ui-kit.md) and hand off to [pixel-art](../pixel-art/SKILL.md) when appropriate. Specify component states, content areas, stretchable regions, and separate icons or illustrations. Keep editable text in Godot unless the user intentionally requests baked lettering. Use image assets for requested artwork; procedural visuals remain an option when the project chooses them.

For all newly generated UI images, including panels, portraits, cards, and icons, follow [pixel-art](../pixel-art/SKILL.md): ask once for style reference images when none have been supplied and availability has not been answered, then generate -> directly import into Pixelorama. Animated artwork starts with a multi-frame reference sprite sheet. Preserve imported pixels by default; report inspection findings and edit the artwork only when corrections are requested. Follow [image production](../../shared/references/image-production.md) and preserve the UI's adopted rendering style.

Build layout with appropriate Control containers, anchors, sizing, and theme resources. Nine-patch treatment suits components with protected corners and repeatable/stretchable centers; it is not required for every component. Align hit targets and focus with visible elements. Account for hover, pressed, disabled, selected, and transitional states that the actual interface needs.

Test the interaction with real input, including opening, selection, confirmation, cancellation, and focus recovery where relevant. Check target resolutions, resizing, long text, and game-world input blocking. Inspect transitions in motion rather than relying only on a static screenshot.

Return changed scenes, themes, source art, exports, tested display/input combinations, and remaining issues. Use [shared contracts](../../shared/contracts.md) for handoffs and [review methods](../../shared/references/review-methods.md) for evidence.
