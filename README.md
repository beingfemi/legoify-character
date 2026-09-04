# Legoify Character

A 3D brick-built LEGO character you can pose, recolour and spin around.

It opens straight on the character — there's no upload step. The figure is a
procedural humanoid volume — capsules and ellipsoids for legs, hips, torso,
arms, neck and head — voxelised onto a grid and rebuilt brick by brick.

## What you can change

| | Options |
|---|---|
| **Skin** | 8 tones, light through deep |
| **Hair** | none, short, curls, afro, long, ponytail, bun, locs, headwrap — in 14 colours |
| **Body** | slim, athletic, curvy, broad, round |
| **Top** | tee, long sleeve, tank, hoodie, jacket |
| **Bottom** | trousers, shorts, skirt, dress |
| **Extras** | glasses, beard |
| **Pose** | stand, point, cheer |

**Shuffle** rolls a random character. That's 1,800 shape combinations before
colour, and every one is verified to build.

### On the design of these options

Every axis is independent — nothing is gated behind a gender, and no
combination is disallowed. Silhouettes are named for shape (`curvy`, `broad`)
rather than for who is supposed to wear them, so any body can take any hair and
any clothing. Skin is a spread of tones rather than a set of categories.
`headwrap` is included so head coverings are a first-class option rather than
an omission.

Body silhouettes vary shoulder, chest, waist and hip **independently**, so the
torso profile is a three-point curve (hip → waist → chest) rather than a single
taper.

A photo is **optional**: hit **Photo** (or drop an image anywhere on the page)
and skin, hair, top and bottom colours are read from four regions of it. Skin
and hair snap to their own palettes rather than the full brick set, so a photo
can't produce an implausible skin tone.

Eyes are printed round tiles (a canvas-generated texture on a cylinder cap)
with iris, pupil and catchlight; glasses are real geometry. Every hairstyle is
masked against a face zone, so hair can never cover the eyes — the build sweep
asserts all 1,800 combinations still yield exactly two eye anchors.

> Sibling project: **[Legoify Likeness](https://github.com/beingfemi/legoify-likeness)**
> runs a depth model to rebuild the photo's *actual* 3D shape.
> The two share `brickscene.js` by copy — a fix in one needs porting to the other.

## Interface

Brutalist: hard 2px rules, zero border-radius, monospace throughout, no blur or
soft shadows, black/white with one yellow accent. The menu is a flush-left
sidebar that takes real layout space rather than floating over the model — the
renderer sizes itself to the canvas box, not the window, so the figure stays
centred in the space beside it. Under 900px the menu collapses to an OPTIONS
button and the bottom bar goes full-bleed.

Dock separators are the black backdrop showing through 2px flex gaps rather
than per-button borders, so a wrapped row never leaves a stray rule or a ragged
block of backdrop.

## Renderer (`brickscene.js`)

Takes a `Map` of `"x,y,z" → colour` and:

- culls fully-enclosed bricks, keeping only the visible shell
- groups the rest by colour and by whether a stud shows, drawing each group as
  one `InstancedMesh`
- adds a stud only where nothing sits on top
- animates the build from above, brick by brick
- fits camera and shadow frustum to whatever it was given

Colour matching uses a redmean-weighted distance plus a saturation penalty, so
near-neutral pixels land on greys and whites rather than being dragged onto a
saturated brick (which is how white turns pink).

### Making it read as plastic

Two layers of ambient occlusion, because one isn't enough:

- **Baked**, for the large crevices. The model is voxels, so each brick's
  occlusion is known exactly — computed from weighted neighbour occupancy and
  carried as a per-instance colour multiplier. Free at render time.
- **GTAO**, for the fine detail baked AO can't reach: the shading around every
  stud base and brick seam.

Ambient light is deliberately low (0.14) so the occlusion isn't washed out.
Materials are physically-based ABS — clearcoat 1.0 over 0.30 roughness — lit by
a generated studio environment.

Three things this setup needs care with:

- The canvas is **transparent** over the page's white. ACES tone mapping maps
  pure white to ~0.81, so a white clear colour inside the composer renders grey.
- The shadow-catcher plane is hidden during the AO prepass, or GTAO shades the
  infinite ground and greys the whole page.
- Near/far planes track camera distance every frame — snug enough for a precise
  AO prepass, never so snug that zooming in clips into the model.

## Stack

Plain HTML/CSS/JS, no build step. [three.js](https://threejs.org) via CDN import
map. Everything runs client-side — no image ever leaves the browser.

## Run locally

```bash
npx serve .
```
