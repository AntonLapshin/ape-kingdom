# Pixel-art game icons

Theme-independent brand asset set (per `guidelines/GUIDELINES-WEB-THEME.md` §6
rule 3) used to render sites and ape units in the Ape Kingdom client.

## Source

These 8 icons were extracted from the image attached to GitHub issue #103
([https://github.com/user-attachments/assets/717ac273-8ea2-4881-9661-9d2e69e45b2e](https://github.com/user-attachments/assets/717ac273-8ea2-4881-9661-9d2e69e45b2e)).
That source is a 593×1064 PNG of 8 pixel-art icons on a white background,
arranged 4 rows × 2 columns.

| Grid position | Icon            | File                 |
| ------------- | --------------- | -------------------- |
| Row 0, col 0  | Home Tree       | `home-tree.png`      |
| Row 0, col 1  | Monkey Nest     | `monkey-nest.png`    |
| Row 1, col 0  | Monkey          | `monkey.png`         |
| Row 1, col 1  | Gibbon          | `gibbon.png`         |
| Row 2, col 0  | Chimpanzee      | `chimpanzee.png`     |
| Row 2, col 1  | Gorilla         | `gorilla.png`        |
| Row 3, col 0  | Mountain        | `mountain.png`       |
| Row 3, col 1  | Grave           | `grave.png`          |

## Extraction

Each icon's content bounding box was located by finding the connected
components of non-white pixels in the source grid. Each icon was then cropped
to its bounding box (plus a small transparent margin) and its white background
removed:

- Only **actual background** white is removed — a flood fill is started from
  the crop border and any near-white pixel reachable from it is made
  transparent. Enclosed white detail that is surrounded by icon content (for
  example the Gibbon's face) is preserved opaque, so no icon content is lost.
- The background/edge pixels are feathered smoothly (partial alpha) so the
  icons composite cleanly onto any background without a hard white halo.

The extraction is reproducible via `scripts/extract-icons.py` (run from the
repository root):

```bash
python3 scripts/extract-icons.py source-image.png --out src/assets/icons
```

## Consuming

Import the asset URLs through the barrel module:

```ts
import { gameIcons } from "@/assets/icons";
// gameIcons.monkey, gameIcons.gibbon, ... are PNG URLs
```

Each file is an RGBA PNG (transparent background). The assets are intended to
be rendered by the UI (milestone M16-T2) and are deliberately kept out of
`src/core` business logic, which remains 100% covered.
