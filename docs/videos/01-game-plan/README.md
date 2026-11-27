# Around the World game plan

[Watch the captioned game plan (MP4, 1 min 27 sec)](01-game-plan.mp4) · [Read the transcript](script.md) · [Listen to the narration](01-game-plan.mp3) · [Open the slides](slides.html)

The film follows Zuri from picking a kid to earning a passport stamp. The Duel and World Map footage comes from the running game. The side-on walking close-up uses the same exported Blender model and animation as the classroom. The eight chapters follow the [Around the World Game Plan](https://www.magicpatterns.com/os/nd2mtiXD3P5QJSqkJZwjJf?file=guo1pPBF4Rk5GRhNMz5htZ).

## Rebuild the film

The checked-in media includes the screenshots, recordings and rendered walk. With the frontend dependencies, Playwright Chromium, Edge TTS, FFmpeg and FFprobe installed, run these commands from the repository root.

```sh
python3 tools/video-audio/game-plan.py
node tools/video-build/game-plan.mjs
```

To refresh the gameplay footage, build the game and run the game-plan project in the frontend workspace. Its Playwright output contains duel.webm and walk.webm. Transcode them to H.264 in media/. The magic-patterns project supplies the desktop screenshots for the slides. The Blender filming script renders the close-up into .cache/game-plan/stride/.
