"""Fetch development assets from their original publishers (no user files uploaded)."""
import json
import pathlib
import ssl
import urllib.request
import certifi

root = pathlib.Path(__file__).resolve().parents[1]
context = ssl.create_default_context(cafile=certifi.where())
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Everyday-development'}), context=context, timeout=60) as response:
        return response.read()
words = get('https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt').decode()
(root / 'engine/words.txt').write_text('\n'.join(line.split()[1] for line in words.splitlines() if line.strip()) + '\n', encoding='utf-8')
print('Saved 7776-word EFF passphrase dictionary.')
license_text = get('https://www.gnu.org/licenses/agpl-3.0.txt').decode()
(root / 'LICENSE').write_text(license_text, encoding='utf-8')
print('Saved license text.')
