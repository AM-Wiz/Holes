# TODO

## Triage

- [x] Switch screen to utf16 encoding
  - This will make available many necessary characters
- [ ] Design entity system
- [x] Redesign `TrnMap` & `TrnMapChunk` interface
  - Should provide options for indexed and x, y-pair access

## Close Term

- [ ] Redesign `TrnTile` graphic component
  - [ ] Should tiles be able to define custom drawing behavior?
  - [ ] Should tiles be able to access the full 256 ansi colors?
- [ ] Create combined format for `CColor` and `Color256`
  - `CColor` can be redesigned as a mapping on `Color256`
    - All `CColor` exist in the `Color256` table
- [ ] Create 'sprite' format for the screen subsystem
  - The screen should be able to efficiently blit sprites
- [ ] Create 'formatted text block' format for the screen subsystem
  - Should be pre-flowed and blittable to the screen buffer

## Long Term

- [ ] Implement 'shadowing' for `TrnMap` rendering
  - March across field calculating height differential,
  shadow each tile based off of 'light vector'
  - Will likely look better, and give a better sense of
  depth than plain depth-based color modulation
  - [ ] Shadows should probably be cached, how?
