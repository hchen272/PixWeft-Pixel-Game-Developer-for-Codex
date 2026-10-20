import { object, required, ToolError } from './project.mjs';

const MODES = new Set(['concept', 'production', 'patch', 'review']);
const TYPES = new Set(['character', 'animation', 'prop', 'tile', 'background', 'scene-kit', 'ui', 'icon', 'effect', 'other']);
// Keep the historical default route identifier compatible; its current policy is direct import.
const CREATION_ROUTES = new Set(['generated-draft-refine', 'reference-led-redraw', 'cleanup-import', 'existing-native-edit']);
const LABELS = {
  creation_route: 'Artwork creation route',
  subject: 'Subject and required parts', purpose: 'In-game purpose', perspective: 'View and perspective',
  composition: 'Composition and framing', target_canvas: 'Target editable pixel canvas', generation_size: 'Generator output size (separate from target canvas)',
  display_scale: 'Expected in-game display scale', pixel_scale: 'Pixel density and grid', palette: 'Palette and material color ramps',
  lighting: 'Lighting', outline: 'Outline treatment', background: 'Background and alpha requirements',
  anchor: 'Ground contact and pivot', layers: 'Required separable parts', layout: 'Frame or module layout',
  motion: 'Motion and timing', variation: 'Allowed variation', preserve: 'Preserve', changes: 'Change',
  constraints: 'Additional constraints', deliverables: 'Expected deliverables', checks: 'Review criteria'
};
const format = value => typeof value === 'string' ? value : JSON.stringify(value);
export function assemblePrompt(args, profile = {}) {
  const spec = object(args.spec, 'spec');
  const mode = args.mode ?? 'production';
  const assetType = args.asset_type ?? 'other';
  if (!MODES.has(mode) || !TYPES.has(assetType)) throw new ToolError('INVALID_ARGUMENT', 'Unsupported prompt mode or asset_type.');
  const creationRoute = spec.creation_route ?? (mode === 'production' ? 'generated-draft-refine' : undefined);
  if (creationRoute !== undefined && !CREATION_ROUTES.has(creationRoute)) throw new ToolError('INVALID_ARGUMENT', 'spec.creation_route must be generated-draft-refine, reference-led-redraw, cleanup-import, or existing-native-edit.');
  const nativeEdit = creationRoute === 'existing-native-edit' && (mode === 'production' || mode === 'patch');
  const requiresGeneration = mode !== 'review' && !nativeEdit;
  const explicitNativeWork = creationRoute !== undefined && creationRoute !== 'generated-draft-refine';
  const pixeloramaHandoff = mode === 'production' || mode === 'patch' ? (explicitNativeWork ? 'authorized-edit' : 'direct-import') : 'none';
  if (mode !== 'review') required(spec.subject ?? spec.purpose, 'spec.subject or spec.purpose');
  if (mode === 'patch' && (!spec.changes || !spec.preserve)) throw new ToolError('INVALID_ARGUMENT', 'Patch requests need both changes and preserve.');
  if (spec.style_reference_answered !== undefined && typeof spec.style_reference_answered !== 'boolean') throw new ToolError('INVALID_ARGUMENT', 'spec.style_reference_answered must be a boolean.');
  const references = args.references ?? [];
  if (!Array.isArray(references)) throw new ToolError('INVALID_ARGUMENT', 'references must be an array.');
  const sections = [`Task: ${mode} / ${assetType}.`];
  if (Object.keys(profile).length) sections.push(`Project visual choices (only declared values apply):\n${JSON.stringify(profile, null, 2)}`);
  if (references.length) sections.push('Reference roles:\n' + references.map((r, i) => {
    object(r, 'reference'); return `${i + 1}. ${required(r.source, 'reference.source')} — use for ${required(r.role, 'reference.role')}${r.preserve ? `; retain ${format(r.preserve)}` : ''}.`;
  }).join('\n'));
  const hasStyleReference = references.some(reference => /\b(?:style|stylistic|art direction|visual direction)\b/i.test(reference.role));
  const requiresStyleReferenceQuestion = requiresGeneration && !hasStyleReference && spec.style_reference_answered !== true;
  const styleReferenceQuestion = 'Do you have any style reference images you would like me to use?';
  if (requiresStyleReferenceQuestion) sections.push('Before generating, proactively ask once whether the user has style reference images. A written style description alone does not answer that question. Reuse an earlier answer or supplied style references instead of asking again. Reference images are optional: if none are available, continue with the declared direction and state any needed assumption; do not require an upload or create an approval gate.');
  else if (requiresGeneration) sections.push('Reuse the supplied style reference images or the earlier answer about their availability; do not repeat the reference question. Use only the declared creative direction.');
  for (const [key, label] of Object.entries(LABELS)) if (spec[key] !== undefined && spec[key] !== null && spec[key] !== '') sections.push(`${label}: ${format(spec[key])}`);
  const extra = Object.fromEntries(Object.entries(spec).filter(([key]) => !(key in LABELS) && key !== 'style_reference_answered'));
  if (Object.keys(extra).length) sections.push(`Additional supplied requirements: ${JSON.stringify(extra)}`);
  if (mode === 'production') {
    if (creationRoute === 'generated-draft-refine') {
      if (assetType === 'animation') sections.push('First generate a multi-frame reference sprite sheet in the declared visual style. Use the project-supplied subject, action, timing, frame layout, perspective, canvas, and pixel density; do not invent a fixed frame count or view. Then directly import the sheet as editable frames into Pixelorama. Preserve the generated pixels without proactive retouching, redraw, or cleanup. Inspect every frame and the complete sequence, including anatomy and attachments, contact and recovery poses, registration, timing, transitions, and the loop boundary when a loop is requested. Report observed issues; make pixel edits only when the user has requested them.');
      else sections.push('Generate reference artwork in the declared visual style, then directly import it into Pixelorama. This workflow applies to every generated artwork type, including characters, buildings, scenes, decorations, props, cards, icons, UI, backgrounds, and effects. Use only the project-supplied perspective, canvas, pixel density, palette, and other creative choices. Preserve the generated pixels without proactive retouching, redraw, or cleanup. Inspect its details and report observed issues; make pixel edits only when the user has requested them.');
      sections.push('Import and save the editable source and requested exports without automatically altering pixel content. Review can check complete forms and required parts, alpha, readability, and the declared pixel grid or material ramps. An observed defect does not itself authorize a canvas edit; report it and leave the imported pixels intact unless correction was requested. Record what was imported and which checks remain unverified.');
    }
    else {
      if (creationRoute === 'reference-led-redraw') sections.push('Generate a drawing reference for explicitly requested native Pixelorama authoring, not a finished runtime asset. This selected route must author the silhouette, deliberate pixel clusters, and required layers or animation poses at the declared target scale, then review the source and export. Importing, resizing, quantizing, or saving this reference alone does not complete native drawing.');
      else if (creationRoute === 'cleanup-import') sections.push('Produce a readable candidate whose pixel data will be retained for explicitly requested cleanup/import. Native editing must repair observed defects within the requested scope and verify the target canvas, frame alignment, alpha, and export. Do not describe this route as a reference-led redraw.');
      else sections.push('Open the existing native source in Pixelorama, inspect the authorized edit area, and make required adjustments on its actual canvas. Preserve that source structure and unaffected work. New reference generation is optional when useful; do not require regeneration for native maintenance or silently replace the source with a generated image.');
      sections.push('For the explicitly requested native work, check contours, complete forms and required parts, alpha, and readability; also check the pixel grid and material ramps when applicable to the declared style. Make only authorized Pixelorama canvas edits, using the GUI or supported native pixel operations. Importing, resizing, quantizing, saving, or making an unrelated token edit alone is not defect correction. If inspection finds no defects requiring edits, record that honestly instead of inventing adjustments. Save and review the editable source and exports after any edits.');
    }
  }
  if (mode === 'concept') sections.push('Explore the declared visual direction. Mark this as a concept candidate rather than an approved runtime asset.');
  if (mode === 'patch') {
    if (nativeEdit) sections.push('Open the existing native source in Pixelorama and repair only the authorized image region or animation frames on its actual canvas. Preserve unaffected regions, frames, and layers; do not require reference generation or full-asset regeneration for this native repair.');
    else {
      sections.push('Generate only the authorized image patch candidate, not a full replacement asset. Import or merge that candidate into Pixelorama only for the authorized image region or animation frames. Preserve unaffected regions, frames, and layers rather than regenerating the complete asset.');
      if (creationRoute === 'reference-led-redraw') sections.push('Use that candidate as a reference for the explicitly requested native redraw. Author only the requested patch on the actual Pixelorama canvas; importing or resizing the reference alone does not complete this authoring route.');
      else if (creationRoute === 'cleanup-import') sections.push('For this explicitly requested cleanup/import, make only the required Pixelorama canvas corrections within the authorized patch region or animation frames.');
      else sections.push('Directly import the authorized patch pixels without proactive retouching, redraw, or cleanup afterward. Inspect its details and report remaining issues; an observed defect does not authorize extra native pixel edits.');
    }
    sections.push('Keep the approved identity and scale consistent with the supplied references. Inspect the patched details and their boundaries for unintended changes, and check affected frame transitions when applicable. Save and review the editable source and affected exports; import success alone does not establish that the requested visual repair passed.');
    if (pixeloramaHandoff === 'authorized-edit') sections.push('For the explicitly requested native work, correct only the authorized defects through the Pixelorama GUI or supported native pixel operations and recheck the result. Report additional findings without editing them. If no further authorized edits are needed, record that honestly.');
  }
  if (mode === 'review') sections.push('Inspect the supplied result against the declared criteria. Report visible evidence, uncertain findings, and required revisions; do not generate a replacement or edit pixels.');
  return {
    mode, asset_type: assetType, ...(creationRoute ? { creation_route: creationRoute } : {}), prompt: sections.join('\n\n'), references,
    requires_generation: requiresGeneration, generation_performed: false,
    requires_style_reference_question: requiresStyleReferenceQuestion,
    ...(requiresStyleReferenceQuestion ? { style_reference_question: styleReferenceQuestion } : {}),
    pixelorama_handoff: pixeloramaHandoff,
    unverified_requirements: ['target pixel grid when applicable', 'declared palette compliance', 'alpha and completeness', 'in-game readability', ...(assetType === 'animation' ? ['per-frame detail and registration', 'sequence timing, transitions, and requested loop continuity'] : [])],
    next_step: mode === 'review' ? 'Use available image inspection to review the supplied images without changing them.' : nativeEdit ? 'Inspect and adjust the existing native source in Pixelorama within the requested scope; this tool has only assembled the prompt.' : requiresStyleReferenceQuestion ? 'Ask once about style reference images, then use an available image-generation/editing tool. An upload is optional; this tool has only assembled the prompt.' : pixeloramaHandoff === 'direct-import' ? 'Generate using the declared references and directly import into Pixelorama without proactive pixel edits; this tool has only assembled the prompt.' : 'Use an available image-generation/editing tool with the referenced images; this tool has only assembled the prompt.'
  };
}
