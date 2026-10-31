# 把 CSS、字体、JS、favicon 内联进单文件 HTML。
from pathlib import Path
import base64
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "src" / "index.template.html"
CSS = ROOT / "styles" / "main.css"
JS = ROOT / "build" / "app.min.js"
FONTS = {
    "__FONT_CORMORANT__": "cormorant.woff2",
    "__FONT_CORMORANT_ITALIC__": "cormorant-italic.woff2",
    "__FONT_PLEX_300__": "plexmono-300.woff2",
    "__FONT_PLEX_400__": "plexmono-400.woff2",
    "__FONT_NOTO__": "noto-serif-sc.woff2",
}
OUT_NAME = "余晖_AFTERGLOW.html"

FAVICON_SVG = (
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
    "<rect width='64' height='64' rx='14' fill='#05070b'/>"
    "<circle cx='32' cy='32' r='15.5' fill='none' stroke='#e4d3b0' stroke-opacity='.72'/>"
    "<ellipse cx='32' cy='32' rx='24' ry='9' fill='none' stroke='#d9b273' stroke-opacity='.55' transform='rotate(-25 32 32)'/>"
    "<circle cx='32' cy='32' r='4.2' fill='#f3e3c3'/>"
    "<circle cx='54' cy='22' r='1.6' fill='#9fe0cf'/>"
    "</svg>"
)


def data_uri(path: Path, mime: str) -> str:
    raw = path.read_bytes()
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def main() -> int:
    if not JS.exists():
        print("missing build/app.min.js — run esbuild first", file=sys.stderr)
        return 1
    html = TEMPLATE.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    favicon = "data:image/svg+xml;base64," + base64.b64encode(FAVICON_SVG.encode("utf-8")).decode("ascii")

    for token, name in FONTS.items():
        font = ROOT / "fonts" / name
        if not font.exists():
            print(f"missing font: {font}", file=sys.stderr)
            return 1
        css = css.replace(token, data_uri(font, "font/woff2"))
    if "__FONT_" in css:
        print("unreplaced font token remains", file=sys.stderr)
        return 1

    for name, font in FONTS.items():
        print(f"{name}: {font}")

    # JS 里如果出现 </script> 会截断内联脚本，保险起见转义。
    js = js.replace("</script>", "<\\/script>")

    html = html.replace("__CSS__", css)
    html = html.replace("__JS__", js)
    html = html.replace("__FAVICON__", favicon)
    for token in ("__CSS__", "__JS__", "__FAVICON__"):
        if token in html:
            print(f"unreplaced token: {token}", file=sys.stderr)
            return 1

    out = ROOT / OUT_NAME
    out.write_text(html, encoding="utf-8")
    meta = {
        "file": OUT_NAME,
        "bytes": out.stat().st_size,
        "fonts": {k: (ROOT / "fonts" / v).stat().st_size for k, v in FONTS.items()},
        "css": len(css),
        "js": len(js),
    }
    (ROOT / "build" / "build_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"built {out} ({out.stat().st_size / 1024 / 1024:.2f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
