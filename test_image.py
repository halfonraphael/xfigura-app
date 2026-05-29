import os
import urllib.request
import urllib.error

HF_TOKEN = os.environ.get("HF_TOKEN", "")
PROMPT = "bibliotheque de rogelio salmona a bogota, beton brut, lumiere zenitale, rendu architectural photoréaliste"

MODEL = "black-forest-labs/FLUX.1-dev"
URL = f"https://api-inference.huggingface.co/models/{MODEL}"

import json
payload = json.dumps({
    "inputs": PROMPT,
    "parameters": {"width": 1344, "height": 768, "num_inference_steps": 28}
}).encode("utf-8")

req = urllib.request.Request(URL, data=payload, headers={
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json",
    "x-wait-for-model": "true",
})

print(f"Generation en cours avec {MODEL}...")

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    out_path = "test_output.jpg"
    with open(out_path, "wb") as f:
        f.write(data)
    print(f"OK Image sauvegardee : {out_path} ({len(data)} bytes)")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"ERREUR HTTP {e.code}: {body}")
except Exception as e:
    print(f"ERREUR: {e}")
