import { spawnSync } from "node:child_process";
import path from "node:path";
import { cpSync, mkdirSync } from "node:fs";
const python =
  process.env.EVERYDAY_PYTHON ||
  path.resolve(
    process.platform === "win32"
      ? ".venv/Scripts/python.exe"
      : ".venv/bin/python",
  );
const args = [
  "-m",
  "PyInstaller",
  "--noconfirm",
  "--onedir",
  "--name",
  "everyday-engine",
  "--distpath",
  "build/engine",
  "--workpath",
  "build/pyinstaller",
  "--specpath",
  "build",
  "--add-data",
  `${path.resolve("engine/words.txt")}:.`,
];
for (const mod of [
  "pymupdf",
  "pymupdf4llm",
  "pillow_heif",
  "imageio_ffmpeg",
  "faster_whisper",
  "ctranslate2",
  "tokenizers",
  "onnxruntime",
  "kokoro_onnx",
  "espeakng_loader",
  "phonemizer",
  "language_tags",
  "csvw",
  "segments",
  "certifi",
])
  args.push("--collect-all", mod);
args.push("engine/worker.py");
const result = spawnSync(python, args, { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
mkdirSync("src-tauri/engine", { recursive: true });
cpSync("build/engine/everyday-engine", "src-tauri/engine", { recursive: true });
