"""Opt-in integration check: downloads local models, synthesizes, transcribes, converts."""
import sys
from pathlib import Path
import json
import wave
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine.worker import dispatch, hash_file
root = Path('.cache').resolve()
def run(tool, files=None, **options):
    result = dispatch({'tool':tool,'files':files or [],'options':options,'output_dir':str(root/'speech-check'),'model_dir':str(root/'models')})
    print(json.dumps({'tool':tool, 'result':result})); return result
audio = run('audio-speak', text='Hello. This is Everyday. Your files stay on your computer. Have a wonderful day.')
with wave.open(audio['files'][0]) as wav:
    assert wav.getnframes() > wav.getframerate()
transcript = run('audio-transcribe', files=audio['files'])
assert 'computer' in transcript['text'].lower(), transcript['text']
mp3 = run('audio-mp3', files=audio['files'])
assert Path(mp3['files'][0]).stat().st_size > 1000
print('SPEECH ROUNDTRIP PASSED')
print(json.dumps({str(p.relative_to(root/'models')): hash_file(p) for p in (root/'models').rglob('*') if p.is_file()}, indent=2))
