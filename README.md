CD_PROJECT

Running the project (frontend + optional mock backend)

1. Install dependencies

```bash
cd /Users/lakshanagopu/Desktop/CD-mini/CD_PROJECT
npm install
```

2. Configure backend URL (no hardcode)

Copy `.env.example` to `.env` and edit if needed:

```bash
cp .env.example .env
# then edit .env if your backend is at a different URL
```

The frontend reads the backend base URL from `VITE_BACKEND_URL`. Example value:

VITE_BACKEND_URL=http://localhost:8000

3. Start the mock backend (optional) or your real backend

To run the mock backend included in this repo:

```bash
npm run mock
```

To run the new real backend (requires `clang` installed and Python 3.8+):

```bash
# create and activate a virtualenv (recommended)
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/server.py
```

The real backend exposes the same `/compile` and `/fix` endpoints but uses `clang` to produce diagnostics and more accurate suggestions. The mock backend remains available for testing if clang is not installed.

4. Start the frontend dev server

```bash
npm run dev
```

5. Open the app

Open the Vite-printed local URL (usually http://localhost:5173 or another port) and click "Compile Code". The frontend will POST to `${VITE_BACKEND_URL}/compile`.

Notes
- Make sure `VITE_BACKEND_URL` is set in `.env` before starting the dev server. Vite reads env at startup.
- The mock backend exposes `/compile` and `/fix` and returns JSON with `fixes` following the minimal-change rules.
