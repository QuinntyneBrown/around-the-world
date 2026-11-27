// Render captioned slides in Chromium, then composite the recorded game and Blender walk.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = createRequire(join(root, "frontend/package.json"))(
  "playwright",
);
const video = join(root, "docs/videos/01-game-plan");
const cache = join(root, ".cache/game-plan");
const timings = JSON.parse(readFileSync(join(cache, "timings.json")));
const ff = (...args) => {
  const run = spawnSync("ffmpeg", ["-loglevel", "error", "-y", ...args], {
    stdio: "inherit",
  });
  if (run.status !== 0) throw Error("Video encoding failed");
};
const seconds = (stamp) =>
  stamp
    .split(/[:,]/)
    .map(Number)
    .reduce((total, n, i) => (i === 3 ? total + n / 1000 : total * 60 + n), 0);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  for (const [i, chapter] of timings.entries()) {
    await page.goto(
      pathToFileURL(join(video, "slides.html")).href + "#" + (i + 1),
    );
    const slide = page.locator("section.active");
    const cue = await slide.getAttribute("data-cue");
    if (!cue || !chapter.text.startsWith(cue))
      throw Error("Missing slide cue: " + chapter.heading);
    console.log(chapter.heading, chapter.seconds);
    if (process.argv.includes("--check")) continue;
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((im) => im.decode()));
    });
    const subs = readFileSync(join(cache, "part-" + i + ".srt"), "utf8")
      .trim()
      .split(/\r?\n\s*\r?\n/)
      .map((s) => {
        const [, range, ...lines] = s.split(/\r?\n/);
        return {
          start: seconds(range.split(" --> ")[0]),
          text: lines.join(" "),
        };
      });
    const cuts = [];
    for (const [k, sub] of subs.entries()) {
      const name = "slide-" + i + "-" + k + ".png";
      await slide.locator("footer").evaluate((el, text) => {
        el.textContent = text;
      }, sub.text);
      await page.screenshot({ path: join(cache, name) });
      const duration =
        (subs[k + 1]?.start ?? chapter.seconds) - (k === 0 ? 0 : sub.start);
      cuts.push("file '" + name + "'\nduration " + duration.toFixed(3));
    }
    const last = "slide-" + i + "-" + (subs.length - 1) + ".png";
    writeFileSync(
      join(cache, "frames-" + i + ".txt"),
      cuts.join("\n") + "\nfile '" + last + "'\n",
    );
  }
} finally {
  await browser.close();
}
if (process.argv.includes("--check") || process.argv.includes("--slides-only"))
  process.exit();
const media = join(video, "media");
const encode = [
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "19",
  "-pix_fmt",
  "yuv420p",
  "-r",
  "24",
  "-threads",
  "3",
];
for (const [i, chapter] of timings.entries()) {
  const args = [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    join(cache, "frames-" + i + ".txt"),
  ];
  let filter = "[0:v]fps=24[screen]";
  if (i === 5 || i === 6) {
    const recording = join(media, i === 5 ? "duel.mp4" : "walk.mp4");
    if (!existsSync(recording)) throw Error("Missing recording " + recording);
    args.push("-i", recording);
    const duration = Number(
      spawnSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "csv=p=0",
          recording,
        ],
        { encoding: "utf8" },
      ).stdout.trim(),
    );
    // Replay the recorded duel across its chapter. Show the map at game speed.
    const rate = i === 5 ? chapter.seconds / duration : 1;
    filter +=
      ";[1:v]setpts=" +
      rate.toFixed(4) +
      "*PTS,scale=1280:900[play];[screen][play]overlay=590:70:eof_action=pass[played]";
    if (i === 6) {
      args.push("-i", join(media, "stride.mp4"));
      filter +=
        ";[2:v]setpts=1.4*PTS+4/TB,scale=1280:900[stride];[played][stride]overlay=590:70:eof_action=pass:enable='gte(t,4)'[out]";
    } else filter += ";[played]null[out]";
  } else filter += ";[screen]null[out]";
  ff(
    ...args,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-an",
    "-t",
    String(chapter.seconds),
    ...encode,
    join(cache, "chapter-" + i + ".mp4"),
  );
}
writeFileSync(
  join(cache, "chapters.txt"),
  timings.map((_, i) => "file 'chapter-" + i + ".mp4'").join("\n"),
);
ff(
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  join(cache, "chapters.txt"),
  "-i",
  join(video, "01-game-plan.mp3"),
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "160k",
  "-movflags",
  "+faststart",
  "-shortest",
  join(video, "01-game-plan.mp4"),
);
