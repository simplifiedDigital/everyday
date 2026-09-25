# Third-party components

Everyday source is licensed under GNU AGPL version 3 or later (see LICENSE). This inventory does not replace dependency license files or required corresponding source.

| Component | License / source |
| --- | --- |
| Tauri | MIT / Apache-2.0 — https://github.com/tauri-apps/tauri |
| React, Vite, Lucide | MIT / ISC as distributed in their packages |
| Python | PSF license — https://www.python.org/psf/license/ |
| PyMuPDF and PyMuPDF4LLM | AGPL-3.0 or commercial — https://pymupdf.io/licensing |
| Pillow | HPND — https://github.com/python-pillow/Pillow |
| pillow-heif / libheif | BSD-3-Clause / LGPL-3.0 — inspect bundled codec licenses |
| openpyxl | MIT — https://openpyxl.readthedocs.io/ |
| imageio-ffmpeg | BSD-2-Clause wrapper; bundled FFmpeg has separate LGPL/GPL terms — https://github.com/imageio/imageio-ffmpeg |
| faster-whisper / CTranslate2 | MIT — https://github.com/SYSTRAN/faster-whisper |
| Whisper model | MIT — https://github.com/openai/whisper |
| Kokoro ONNX runtime wrapper | MIT — https://github.com/thewh1teagle/kokoro-onnx |
| Kokoro model and voices | Apache-2.0 — https://huggingface.co/hexgrad/Kokoro-82M |
| ONNX Runtime | MIT — https://github.com/microsoft/onnxruntime |
| eSpeak NG / phonemizer | GPL-3.0 — https://github.com/espeak-ng/espeak-ng and https://github.com/bootphon/phonemizer |
| EFF long word list | EFF, CC BY 3.0 — https://www.eff.org/dice |
| DM Sans and Manrope | SIL Open Font License — distributed through @fontsource packages |
| PyInstaller bootloader | GPL-2.0-or-later with bootloader exception — https://pyinstaller.org/ |

The EFF word list is stored without the dice-number column; words are otherwise unchanged. Six independently and uniformly chosen words from 7,776 entries provide approximately 77.5 bits of entropy.

Models are downloaded from their original publishers, never executed as Python or pickle files. The speech engine uses ONNX and CTranslate2 data files. Model checksums are verified before use.

Release checklist: ship all dependency license texts, corresponding source and build information where required, review codecs and transitive dependencies, and retain this attribution inventory. Do not describe an unsigned development artifact as a signed public release.
