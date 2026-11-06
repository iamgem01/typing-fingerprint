from pathlib import Path
root = Path(__file__).resolve().parents[1]
recorder = (root / 'dist/recorder.mjs').read_text(encoding='utf-8').replace('export ', '')
app = (root / 'dist/app.js').read_text(encoding='utf-8').split('\n', 1)[1]
(root / 'dist/app.bundle.js').write_text(
    "/* Browser bundle: avoids ES module MIME-type dependencies. */\n(()=>{\n'use strict';\n"
    + recorder + '\n' + app
    + "\ndocument.getElementById('start').disabled=false;\n})();\n",
    encoding='utf-8',
)
