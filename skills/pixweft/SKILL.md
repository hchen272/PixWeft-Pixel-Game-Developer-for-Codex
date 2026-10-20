---
name: pixweft
description: Coordinate end-to-end pixel game development in Godot with Pixelorama, from idea discussion to playable prototypes, production, review, and builds. Use for broad or multi-discipline game requests; route precise local tasks to the relevant specialist.
---

# PixWeft

Determine whether the user wants discussion, implementation, review, or delivery. Respect that scope; a request to plan stays in planning. For an existing game, inspect its project and current conventions before proposing changes. Read [shared contracts](../../shared/contracts.md) when establishing project state or handing work across disciplines.

Select only the skills needed for the current task:

| Need | Read |
| --- | --- |
| Explore an idea, choose scope, validate a mechanic | [game-design](../game-design/SKILL.md) |
| Image prompts, sprites, animation, pixel editing | [pixel-art](../pixel-art/SKILL.md) |
| Maps, freely placed objects, backgrounds, modules | [godot-scenes](../godot-scenes/SKILL.md) |
| Input, rules, interactions, state, gameplay code | [godot-gameplay](../godot-gameplay/SKILL.md) |
| Interface layout, visual states, interaction | [game-ui](../game-ui/SKILL.md) |
| Visual or gameplay problems, playtesting | [game-review](../game-review/SKILL.md) |
| Export and delivery | [game-build](../game-build/SKILL.md) |

Read and apply a selected skill directly, or delegate a bounded task when agents are available. Do not assume a nested-Skill invocation API. Return specialist results to this coordinator; avoid routing cycles. Use [delegation prompts](../../shared/prompts/delegation.md) for shared-file ownership or independent review.

Discuss only consequential uncertainty. Offer a recommended option and tradeoffs when useful; avoid a mandatory questionnaire. Converge on a small playable target that answers the current question, then implement when authorized. Use temporary assets if appropriate and label them as such.

Discover actual tool capabilities before promising native editing or runtime inspection. Coordinate source artwork, runtime resources, scenes, code, and evidence through their real dependencies. Report what works, how it was observed, and what remains unverified. See [workflow examples](../../docs/workflows.md) only when choosing a broader route.

Before new image generation, ask once whether style reference images are available unless the user has supplied them or already answered. Reuse that context; if no references are available, use the brief or adopted project style. For static game images, coordinate generation -> direct Pixelorama import. For animation, first generate a multi-frame reference sprite sheet -> import its frames. This includes UI, cards, portraits, backgrounds, scene objects, and character sprites. Preserve generated pixels by default: inspect and report issues without proactively modifying the artwork. Delegate native pixel edits only when corrections, cleanup, or native authoring are requested. Keep references, native sources, and exports traceable, and validate Godot integration when requested. Preserve existing-source maintenance scope. Project-specific creative settings remain unset until adopted.
