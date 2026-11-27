# Classroom artwork

Build the two shipped glTF scenes from the repository root with Blender and the frontend dependencies installed.

```sh
blender -b --python-exit-code 1 -P tools/blender/build-classroom.py
blender -b --python-exit-code 1 -P tools/blender/build-cast.py
blender -b --python-exit-code 1 -P tools/blender/check-walk.py
```

The classroom builder takes the desk and landmark templates from the frontend generator and the rug outlines from the World Map SVG. The cast builder paints the face meshes from the local kid portraits and exports the alternating walk. The check measures sole heights in the exported asset across a complete cycle. The optional film-walk.py renders Zuri in side view for the game-plan film.
