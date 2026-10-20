# Animal animation sources

These examples start with four newly generated character designs: a spoon-billed sandpiper, a red-whiskered bulbul, a ginger kitten, and a corgi puppy. Generated design and motion candidates are reviewed, and selected artwork enters Pixelorama for native animation and detail refinement. Each asset record identifies the actual source pixels, any pose guide, selected or rejected motion studies, and the native edits. The editable sources retain the selected generated artwork and the actual pose, contour, or contact corrections.

The examples use Pixelorama 1.1.10-stable / Extensions API 8 in private application profiles. Their logical canvas sizes, frame counts, frame rates, and layer names are recorded per asset in [manifest.json](manifest.json). These choices belong to the showcase; they are not plugin defaults. No numerical art-palette limit was imposed.

All four final sources use a 128 x 128 canvas, eight frames, and native 8 fps timing. Their actual selected pixels and editing structure differ:

| Animal | Selected production artwork | Native finish | Layers |
| --- | --- | --- | --- |
| Sandpiper | New generated motion design, with its first head/body pose retained | Two-leg support/recovery phases and separated toe branches | 2 |
| Bulbul | Eight new generated crouch, flutter, and landing poses | Identity alignment, body elevation, alpha, and planted contact | 2 |
| Kitten | New generated single-character design | Separated textured limbs, root-preserving articulation, paws, whiskers, and overlap contours | 5 |
| Puppy | New pose-guide-conditioned motion artwork | Head identity, distal paw contact, and local material contours; explicit precontact hold | 3 |

- [references/](references/) contains the new single-animal design references.
- [drafts/](drafts/) contains retained generated inputs or motion studies, with their selection status recorded per asset.
- [prompts.json](prompts.json) records the initial design and motion prompts. Per-asset records include additional studies or pose-guide prompts when used.
- [Kitten studies](ginger-kitten-prompts.json) and [puppy prompts](corgi-puppy-prompts.json) document their additional generation and selection decisions.
- [motion-plan.json](motion-plan.json) records the intended actions, contacts, and primary anatomy or gait references.
- [manifest.json](manifest.json) connects the editable `.pxo` sources to the public PNG sheets and GIFs, with measured file and frame hashes.
- [review.json](review.json) separates visual observations from export decoding and native-source verification.
- [review/](review/) contains selected integer-magnified native detail views.

The sandpiper performs a grounded two-leg walk. The bulbul crouches, pushes off, flutters briefly, extends its feet, lands, and settles. The kitten and puppy use separate four-limb motion plans. Review follows each limb through stance and recovery and checks the final-to-first transition, body stability, complete anatomy, and moving-part attachment.

PNG sheets come from Pixelorama's native export. FFmpeg encodes the native frame PNGs into GIF previews with nearest-neighbor integer magnification. GIF palette encoding is a delivery-format step; the PNG and editable source preserve the native RGB colors. Read the per-asset review for actual timing, decoded-pixel comparisons, and the scope of visual inspection.

Primary references:

- [Cornell Lab: spoon-billed sandpiper facts](https://www.birds.cornell.edu/home/spoon-billed-sandpiper-facts/)
- [Cornell Lab: red-whiskered bulbul identification](https://www.allaboutbirds.org/guide/Red-whiskered_Bulbul/id)
- [University of Minnesota veterinary anatomy: walk](https://vanat.ahc.umn.edu/gaits/walk.html)
- [University of Minnesota veterinary anatomy: trot](https://vanat.ahc.umn.edu/gaits/trot.html)
- [Cat forelimb and hindlimb locomotor coordination](https://pmc.ncbi.nlm.nih.gov/articles/PMC4044364/)

