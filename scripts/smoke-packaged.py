"""Exercise the bundled worker as a user without Python would."""
from pathlib import Path
import json
import os
import subprocess
import sys
import wave
import pymupdf
from PIL import Image
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
exe = root / 'src-tauri' / 'engine' / ('everyday-engine.exe' if os.name == 'nt' else 'everyday-engine')
models = root / '.cache/models'
def run(tool, files=None, **options):
    req = {'tool':tool, 'files': [str(p) for p in files or []], 'options':options, 'output_dir':str(root/'.cache/packaged-check'), 'model_dir':str(models)}
    p = subprocess.run([str(exe)], input=json.dumps(req)+'\n', capture_output=True, encoding='utf-8', timeout=120)
    events = [json.loads(line) for line in p.stdout.splitlines() if line.startswith('{')]
    assert events and events[-1]['event'] == 'result', (p.stdout, p.stderr)
    print(tool, 'PASS'); return events[-1]
run('password', kind='memorable')
csv = root / '.cache/packaged-data.csv'; csv.write_text('Name,Value\nHello,00123\n')
run('sheet-excel', files=[csv])
pdf = root / '.cache/packaged-document.pdf'
with pymupdf.open() as doc:
    p = doc.new_page(); p.insert_text((50,50), 'Everyday document'); doc.new_page(); doc.save(pdf)
run('pdf-split', files=[pdf])
run('pdf-markdown', files=[pdf])
locked = run('pdf-protect', files=[pdf], newPassword='test-password')['files'][0]
run('pdf-unlock', files=[locked], password='test-password')
photo = root / '.cache/packaged-photo.png'; Image.new('RGB', (100,100), 'green').save(photo)
run('image-convert', files=[photo], format='webp')
run('file-zip', files=[photo, pdf])
if '--files-only' not in sys.argv:
    audio = run('audio-speak', text='Hello from Everyday.\n---\n•\n\u200b\nYour files stay on your computer.')
    text = run('audio-transcribe', files=audio['files'])
    assert 'hello' in text['text'].lower()
    assert 'computer' in text['text'].lower()
    run('audio-mp3', files=audio['files'])
print('PACKAGED ENGINE PASSED')
