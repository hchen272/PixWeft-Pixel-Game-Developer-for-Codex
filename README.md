<p align="center">
  <img src="assets/branding/pixweft-logo-2x.png" width="384" alt="PixWeft pixel logo">
</p>

<h1 align="center">PixWeft: Pixel game developer for Codex</h1>

<p align="center">
  <a href="README.md">English</a> &middot; <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">A Codex plugin for building pixel games with Godot and Pixelorama, from ideas and AI-assisted art to gameplay, playtesting, and iteration.</p>

<p align="center">This is an initial <strong>0.1.0 preview</strong> with composable skills and local software tools.</p>

## Showcase

<table>
  <tr>
    <td align="center" valign="middle" width="480">
      <p align="center">
        <img src="assets/showcase/portraits/cigar-portrait.gif" width="192" alt="Nine-frame animated pixel portrait of a man with a cigar">&emsp;&ensp;
      </p>
    </td>
    <td valign="middle">
      <h3>Animated pixel portrait</h3>
      <p>The man smoking a cigar, presented as a short nine-frame loop.</p>
      <p><em>9 frames &middot; 1.8-second loop</em></p>
    </td>
  </tr>
  <tr>
    <td align="center" valign="middle" width="480">
      <p align="center">
        <img src="assets/showcase/presentation/medieval-knight.gif" width="448" alt="Armored medieval knight performing a sword attack">
      </p>
    </td>
    <td valign="middle">
      <h3>Medieval knight &middot; Sword attack</h3>
      <p>A character action that moves through wind-up, a sword strike, and recovery.</p>
      <p><em>Character animation</em></p>
    </td>
  </tr>
  <tr>
    <td align="center" valign="middle" width="480">
      <p align="center">
        <img src="assets/showcase/characters/salaryman-idle.gif" width="320" alt="Tired office worker breathing and blinking while holding coffee">
      </p>
    </td>
    <td valign="middle">
      <h3>Office worker &middot; Idle</h3>
      <p>A quiet breathing and blinking loop for a tired office worker holding coffee.</p>
      <p><em>Character animation</em></p>
    </td>
  </tr>
  <tr>
    <td align="center" valign="middle" width="480">
      <p align="center">
        <img src="assets/showcase/presentation/spoon-billed-sandpiper.gif" width="256" alt="Pixel sandpiper walking with alternating grounded steps">
      </p>
    </td>
    <td valign="middle">
      <h3>Spoon-billed sandpiper &middot; Walk</h3>
      <p>A repeating walk cycle with alternating steps and a recognizable bird silhouette.</p>
      <p><em>Creature animation</em></p>
    </td>
  </tr>
  <tr>
    <td align="center" valign="middle" width="480">
      <p align="center">
        <img src="assets/showcase/animals/red-whiskered-bulbul.gif" width="256" alt="Pixel bulbul crouching, hopping, and landing">
      </p>
    </td>
    <td valign="middle">
      <h3>Red-whiskered bulbul &middot; Hop</h3>
      <p>A small bird moves through anticipation, takeoff, and landing in one loop.</p>
      <p><em>Creature animation</em></p>
    </td>
  </tr>
  <tr>
    <td align="center" valign="middle" width="480">
      <p align="center">
        <img src="assets/showcase/buildings/woodland-cottage.gif" width="256" alt="Detailed cottage with chimney smoke and warm window flicker">
      </p>
    </td>
    <td valign="middle">
      <h3>Woodland cottage</h3>
      <p>Chimney smoke and gentle window-light changes bring a detailed building to life.</p>
      <p><em>Environment animation</em></p>
    </td>
  </tr>
  <tr>
    <td align="center" valign="middle" width="480">
      <p align="center">
        <img src="assets/showcase/buildings/mediterranean-bookshop.gif" width="256" alt="Detailed bookshop with gentle local light and foliage animation">
      </p>
    </td>
    <td valign="middle">
      <h3>Mediterranean bookshop</h3>
      <p>Subtle light and foliage motion preserve the structure and detail of the storefront.</p>
      <p><em>Environment animation</em></p>
    </td>
  </tr>
</table>

Explore different art directions with PixWeft. Find editable sources, sprite sheets, prompts, and production notes in [the showcase](examples/showcase/README.md).

Choose your game's style, camera, canvas, palette, and map structure. PixWeft works with TileMaps, freely placed scenes, layered backgrounds, reusable modules, or a mixture.

## Versions

| Component | Development version |
| --- | --- |
| Godot | **4.6.3 stable**, Windows x86_64 |
| Pixelorama | **1.1.10-stable**, **Extensions API 8** |
| Node.js | **22 or newer** |

Native integrations are developed and tested on Windows. Pixelorama includes its own Godot 4.6.2 runtime, separate from your game's engine.

## Skills

Start with `$pixweft`, or call a specialist directly:

| Skill | What it does |
| --- | --- |
| `pixweft` | Plan the next step and coordinate specialists |
| `game-design` | Discuss ideas, scope, mechanics, and playable prototypes |
| `pixel-art` | Prepare image prompts, import artwork, create animation, and edit pixels on request |
| `godot-scenes` | Build maps, place objects, and set up collision, navigation, and depth |
| `godot-gameplay` | Implement input, rules, interactions, and gameplay state |
| `game-ui` | Build interfaces, visual states, interaction, and responsive layouts |
| `game-review` | Review artwork, playtest, diagnose issues, and check repairs |
| `game-build` | Prepare exports, check builds, and package a playable game |

Use the full workflow for a new game or just one skill for a small task. See [workflow examples](docs/workflows.md).

## Install in Codex

From the plugin directory:

```powershell
npm ci --ignore-scripts
codex plugin marketplace add .
codex plugin add pixweft@pixweft-local
```

Open a new conversation and use `$pixweft` or a specialist. If Codex creates a separate plugin copy, run `npm ci --ignore-scripts` in that copy too. Keep the package's `skills/`, `shared/`, and supporting files together.

## Set up a game workspace

Initialize configuration in your game directory:

```powershell
node scripts/cli.mjs project_init --project /absolute/path/to/game
```

This creates `.pixel-game/project.json` for project choices. Put local application paths and connection settings in the ignored `.pixel-game/project.local.json`:

```json
{
  "tools": {
    "godot_path": "/absolute/path/to/godot-console-executable",
    "pixelorama_path": "/absolute/path/to/Pixelorama.exe",
    "pixelorama_url": "http://127.0.0.1:32124",
    "pixelorama_token": "YOUR_LOCAL_RANDOM_SECRET"
  }
}
```

You can also use `GODOT_PATH`, `PIXELORAMA_PATH`, `PIXEL_GAME_PIXELORAMA_URL`, and `PIXEL_GAME_PIXELORAMA_TOKEN`. Set `PIXEL_GAME_PROJECT_ROOT` to select a game workspace for MCP calls.

Check your setup:

```powershell
node scripts/cli.mjs doctor --project /absolute/path/to/game
```

The existing `.pixel-game/` and `PIXEL_GAME_` names are kept for compatibility.

## Artwork workflow

Before generating artwork, PixWeft asks whether you have style reference images. It reuses references or an answer you've already provided; you can also proceed from a written brief.

- **Static art:** generate an image → directly import into Pixelorama.
- **Animation:** generate a multi-frame reference sprite sheet → import its frames into Pixelorama.

This covers characters, buildings, props, tiles, UI, portraits, and other game images. Generated pixels stay as imported by default. PixWeft can inspect the result and point out issues; pixel adjustments happen when you request them.

Image generation uses Codex's available image tool or a configured provider. The `image_prompt` tool prepares the prompt, including reference roles, canvas, scale, transparency, anchors, and animation layout. Editable sources and exports stay linked for later work in Pixelorama and Godot.

## Godot and Pixelorama tools

**Godot:** create and inspect scenes, edit properties, inspect resources, update project settings, and run input/state/screenshot sequences. Operations run in separate engine processes. See the [Godot bridge](bridges/godot/README.md).

**Pixelorama:** import and export sheets, save and reopen editable `.pxo` files, preview PNGs, and work with pixels, layers, frames, FPS, and palettes. Follow [Pixelorama setup](docs/pixelorama.md) to build and enable the local extension and configure its token and allowed game folders.

Build the extension pack with:

```powershell
npm run build:pixelorama -- --godot <executable>
```

MCP entrypoints: `project_init`, `project_inspect`, `toolchain_doctor`, `image_prompt`, `godot_operation`, `godot_runtime`, `pixelorama_operation`, and `run_status`.

The CLI uses the same entrypoints. For example:

```powershell
node scripts/cli.mjs godot_operation --project /absolute/path/to/game --args request.json
```

With `request.json`:

```json
{"operation":"scene_inspect","args":{"scene_path":"res://main.tscn"}}
```

Godot builds use the standard export CLI through `game-build`. See the bridge documentation for supported operations.

## Development

```powershell
npm run validate
npm test
```

Checks cover package structure, MCP communication, project isolation, asset measurements, and native application workflows. Native tests can be enabled with local application paths; see [validation](docs/validation.md) and the [integration lab](examples/neutral-lab/README.md).

## Credits

The skill structure and discussion-to-review approach were inspired by [Academic Research Skills](https://github.com/Imbad0202/academic-research-skills). See [sources and dependencies](THIRD_PARTY.md). Original plugin code is [MIT licensed](LICENSE).

## Contact

Have questions, feedback, or ideas? Feel free to reach out at [hongliangchen103@gmail.com](mailto:hongliangchen103@gmail.com).
