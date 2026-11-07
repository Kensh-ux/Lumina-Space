#!/usr/bin/env python3
"""窗畔 · 工作台整合版 · 本地启动器

双击本文件，或在终端里运行：
    python 启动.py
    python 启动.py --port 8770 --no-browser

三个世界与音乐需要 HTTP 环境，请勿直接用 file:// 打开 index.html。
"""

import argparse
import functools
import http.server
import json
import os
import sys
import threading
import webbrowser
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PORT = 8770
MUSIC_DIR = os.path.join(ROOT, "assets", "music")
PACK_DIR = os.path.join(MUSIC_DIR, "pack")
MUSIC_MANIFEST = os.path.join(MUSIC_DIR, "library.json")
AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".ogg", ".oga", ".flac", ".aac", ".opus", ".webm"}


def split_track_name(stem):
    """从「歌手 - 曲名」里拆出歌手与曲名。"""
    artist, title = "曲库", stem
    if " - " in stem:
        left, right = stem.split(" - ", 1)
        if left.strip() and right.strip():
            artist, title = left.strip(), right.strip()
    return artist, title


def entry_from_audio(path, name):
    stem = os.path.splitext(name)[0]
    artist, title = split_track_name(stem)
    try:
        size = os.path.getsize(path)
    except OSError:
        size = 0
    return {"file": name, "title": title, "artist": artist, "size": size}


def entry_from_pack(path, stem):
    """单曲压缩包只读目录信息，取音频扩展名与原始大小。

    文件名以 zip 自身的主名为准：zip 名来自磁盘目录，编码可靠；
    包内条目名在部分压缩包里没有 UTF-8 标记，直接读会变成乱码。
    """
    with zipfile.ZipFile(path) as zf:
        info = next(
            (
                item
                for item in zf.infolist()
                if not item.is_dir()
                and os.path.splitext(item.filename)[1].lower() in AUDIO_EXTS
            ),
            None,
        )
        if info is None:
            return None
        ext = os.path.splitext(info.filename)[1].lower()
        name = stem + ext
        artist, title = split_track_name(stem)
        return {"file": name, "title": title, "artist": artist, "size": info.file_size}


def refresh_music_library():
    """扫描 assets/music（散装音频）与 assets/music/pack（单曲压缩包）。

    唱片柜每次启动都会读取这份清单，往文件夹里加歌后重开即可看到。
    如果两种位置都没有歌，就保留现有清单，避免把曲库清空。
    """
    if not os.path.isdir(MUSIC_DIR):
        return 0
    tracks = []
    seen = set()
    for name in sorted(os.listdir(MUSIC_DIR), key=str.lower):
        path = os.path.join(MUSIC_DIR, name)
        if name.startswith(".") or not os.path.isfile(path):
            continue
        if os.path.splitext(name)[1].lower() not in AUDIO_EXTS:
            continue
        tracks.append(entry_from_audio(path, name))
        seen.add(name)

    if os.path.isdir(PACK_DIR):
        for name in sorted(os.listdir(PACK_DIR), key=str.lower):
            path = os.path.join(PACK_DIR, name)
            if name.startswith(".") or not os.path.isfile(path):
                continue
            if os.path.splitext(name)[1].lower() != ".zip":
                continue
            try:
                entry = entry_from_pack(path, os.path.splitext(name)[0])
            except (OSError, zipfile.BadZipFile):
                continue
            if entry and entry["file"] not in seen:
                seen.add(entry["file"])
                tracks.append(entry)

    if not tracks:
        return -1
    try:
        with open(MUSIC_MANIFEST, "w", encoding="utf-8") as fh:
            json.dump(tracks, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    except OSError as exc:
        print("曲库清单写入失败：{}".format(exc))
        return 0
    return len(tracks)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def create_server(start_port):
    handler = functools.partial(Handler, directory=ROOT)
    for port in range(start_port, min(start_port + 30, 65536)):
        try:
            return http.server.ThreadingHTTPServer(("127.0.0.1", port), handler), port
        except OSError:
            continue
    return None, None


def main():
    parser = argparse.ArgumentParser(description="窗畔 · 本地静态服务器")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="起始端口，默认 8770")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()

    count = refresh_music_library()
    if count:
        print("唱片柜已同步 {} 首歌。".format(count))

    server, port = create_server(args.port)
    if server is None:
        print("没有找到可用端口，请用 --port 指定一个空闲端口。")
        return 1

    url = "http://127.0.0.1:{}/".format(port)
    print("窗畔已启动：{}".format(url))
    print("按 Ctrl+C 结束。")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n窗畔已关闭。")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
