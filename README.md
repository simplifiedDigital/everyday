# Everyday

A free desktop toolbox for Windows and macOS. Six categories, 22 tasks, local processing. No accounts or API keys. Speech tools download their models automatically on first use and work offline afterward.

## Included

- PDF: split, merge, extract a page, rotate, true area redaction, add/remove a known password, Markdown with linked images.
- Photos: resize while preserving proportions, JPG/PNG/WebP conversion (including HEIC input), grid collages.
- Files: ZIP, safe extraction, streaming file splitting, verified rejoining.
- Passwords: secure random passwords, EFF word-list passphrases, numeric PINs.
- Spreadsheets: XLSX to CSV, combine workbooks into tabs, formatted CSV to XLSX.
- Audio: video to MP3, local Whisper Base transcription, quantized Kokoro speech synthesis.

Results are saved as new files under Downloads/Everyday. Originals are never overwritten. There is no analytics, application server, or remote file upload in the desktop app. A separate development-only localhost bridge makes it possible to test the same UI in a browser.

## Version and updates

The footer displays the exact installed version. Click it to see the latest published version on [GitHub Releases](https://github.com/simplifiedDigital/everyday/releases). This check sends a public release-metadata request to GitHub; it never sends your files or text. Checks happen when you open the panel or click Check again. If offline, the app says the latest version is unknown. Get update opens the release page in your browser; it does not install anything automatically.

For a new version, run `npm run version:set -- 0.1.3` before building. This keeps the UI, package metadata, native app and installer consistent. Builds fail if the versions disagree. Publish a GitHub release tagged `v0.1.3` to make it discoverable by installed copies. Drafts and prereleases are not offered by this check.

## Develop

Requires Node 22+, Python 3.12, Rust stable, and Tauri system prerequisites (Windows C++ tools/WebView2, or Xcode command-line tools on Mac).

```sh
npm ci
python -m venv .venv
# Windows: .venv\Scripts\python -m pip install -r engine/requirements.txt
# Mac: .venv/bin/python -m pip install -r engine/requirements.txt
npm run desktop
```

Use `npm run dev` for the development browser preview. The preview copies selected files to `.cache/preview/inputs` and writes results to `.cache/preview/outputs`; no external server is involved. Desktop file selection uses native dialogs and works with large files without uploading them to the UI.

## Build

```sh
npm run engine:bundle
npm run desktop:build
```

Build separately on Windows and Mac; GitHub Actions configurations are included for Windows x64, Apple Silicon, and Intel Mac. The Python engine and its native libraries are bundled inside the app. Users do not install Python, FFmpeg, or a model manager.

## Verify

```sh
npm test
npx playwright install chromium
npm run test:ui
```

`python scripts/smoke-speech.py` is an opt-in integration test that downloads the two local speech models, generates a short recording, transcribes it, and converts it to MP3. Use the project's virtual-environment Python.

## Current boundaries

- PDF-to-Markdown preserves text and extracts figures; layout conversion is best effort. Scanned pages are included as images, with an explicit result notice. OCR, editable mathematical notation, and pixel-identical layout are not implemented.
- Spreadsheet merging copies saved values and basic cell formatting. Charts, formulas, macros, and external links are not preserved. CSV imports stay text to preserve leading zeros and prevent formula injection. XLS legacy files are not supported.
- Text-to-speech currently uses one English Kokoro voice. Whisper Base is multilingual; accuracy varies with language, accent, and recording quality.
- Download cancellation is cooperative. A running model inference step finishes before cancellation takes effect.
- Browser preview uploads are capped at 500 MB and rejoining split files requires the desktop app's access to adjacent files.
- Windows is tested locally. Mac builds and signing/notarization require Mac CI/hardware and publisher credentials. No signing credentials are included, no release is published, and no public distribution is claimed.

## Distribution and licensing

Source code is prepared under AGPL-3.0-or-later; dependencies keep their own licenses. See `THIRD_PARTY_NOTICES.md`. Before public distribution, include the corresponding source and required license materials for all bundled binaries, audit the exact FFmpeg build, sign Windows binaries, and sign/notarize Mac bundles. CI artifacts are unsigned development builds until this release work is completed.
