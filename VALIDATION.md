# Validation — Windows development build

Verified locally on Windows on 2026-09-25:

- 19 Python integration/unit tests: PDF split/merge/extraction/rotation/password round trip, text redaction including rotated pages, Markdown with images and scanned-page fallback, image conversion/resize/collage, ZIP round trip and traversal rejection, file split/join and corrupt-part detection, spreadsheet values/styles/formula-injection handling, password modes, cancellation cleanup, actual MP4-to-MP3 conversion, speech chunks with no phonemes, and private speech diagnostics.
- 5 browser interaction tests using the real local worker: six-category home with no external UI requests, password generation, CSV-to-Excel download, speech input, and drawing a redaction whose downloaded PDF no longer contains the redacted text.
- Local speech round trip: quantized Kokoro generated a recording; Whisper Base transcribed it; FFmpeg converted it to MP3. First-use model downloads succeeded. Model SHA-256 values are pinned in the worker.
- Frozen engine checks: password, XLSX generation, PDF splitting, Markdown conversion, PDF protection/unlocking, image conversion, ZIP creation, Kokoro speech, Whisper transcription, MP3 conversion. These checks invoke the bundled executable, not the development Python worker.
- Native Windows WebView2 smoke check: the compiled Tauri window opened, generated a password through its bundled engine, and converted CSV through the native IPC command.
- Production frontend build and Rust compilation succeeded. Local screenshots are under `.cache/screenshots`.

Not verified: macOS execution/installation, clean-machine Windows installation, code signing/notarization, public-release licensing/source bundles, very large files, and exhaustive PDF/Excel fidelity. Mac CI build jobs are prepared but have not been run from this local workspace. This is an unsigned development release.

PDF-to-Markdown is best effort, with scanned pages retained as images rather than OCR text. Workbook merging preserves saved values/basic styles, not formulas/charts/macros. These boundaries are shown in the relevant task screens.

## Speech regression in 0.1.1

The installed 0.1.0 engine reproduced the generic file error with `Hello.\n---\nHave a nice day.`: Kokoro raised `ValueError: need at least one array to concatenate` on the separator. Plain English succeeded through both the engine and the installed desktop UI. The original user's exact input was not available, so this is a confirmed trigger of the reported message rather than a confirmed reconstruction of their attempt.

The worker now skips chunks with no phonemes, reports an actionable message when the entire input is unspoken, and resolves FFmpeg only for MP3 conversion. Unexpected speech failures report a stage and exception code. A local `diagnostics/last-speech-error.json` next to the models directory contains exception type and stack locations, excluding input text, exception messages, and full paths.

The rebuilt frozen worker passed the speech regression with separator, bullet-only and zero-width-character lines. Whisper transcription confirmed speech from both before and after those lines; conversion to MP3 also passed. All 19 Python tests passed.

The rebuilt Windows desktop UI also passed the same mixed-text regression through the native command. Its audio player loaded a finite recording duration greater than one second. The smoke script checks the worker hash before launching the default release folder to prevent accidentally testing an older copied worker.

## Version display in 0.1.2

The footer uses the package build version, then reads Tauri's native installed version in the desktop app. A build-time check prevents package, lockfile, native-app and installer versions from drifting apart. The version panel checks GitHub Releases only when opened or explicitly refreshed. It compares version numbers numerically, handles an installed build newer than the latest release, and never claims the app is current after a failed or invalid response.

Six browser checks cover equal, newer and older release versions, offline failure followed by retry, no published releases, and malformed release metadata. The update comparison includes 0.1.10 versus 0.1.2 to catch lexicographic comparisons. Release metadata is mocked in these checks. The home still makes no external requests. Screenshot: `.cache/screenshots/version.png`.

All 11 interface tests passed. The rebuilt Windows app separately returned native version 0.1.2 and successfully checked the live public GitHub endpoint through its production security policy. The new repository has no published releases yet, which the panel accurately reports. Run `node scripts/smoke-version.mjs` after a Windows build to repeat this check; screenshot: `.cache/screenshots/desktop-version.png`.
