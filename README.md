# Legoify Character

Turn a photo into a 3D brick-built LEGO character you can spin around.

It opens straight on the character — there's no upload step. The figure is a
procedural humanoid volume — capsules and ellipsoids for legs, hips, torso,
arms, neck and head — voxelised onto a grid and rebuilt brick by brick.

A photo is **optional**: hit **Photo** (or drop an image anywhere on the page)
and hair, skin, shirt and trouser colours are read from four regions of it and
snapped to the nearest real LEGO colour. It's a shortcut for picking four
colours you can already set by hand, so it was never worth gating the app
behind.

Stand / point / cheer poses, and every body part is recolourable from the
palette. Eyes are printed round tiles (a canvas-generated texture on a cylinder
cap) with iris, pupil and catchlight.

> Sibling project: **[Legoify Likeness](https://github.com/beingfemi/legoify-likeness)**
> runs a depth model to rebuild the photo's *actual* 3D shape.
> The two share `brickscene.js` by copy — a fix in one needs porting to the other.

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
