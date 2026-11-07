#!/usr/bin/env python3
"""窗畔 · 唱片柜曲库打包

把 assets/music 里的每首歌各打成一个 zip，落到 assets/music/pack/。
每首一个包：单曲 zip 都低于 Pages 的 25 MiB 单文件上限，唱片柜里可以逐首下载。

用法：
    python _tools/pack_music.py            # 只打缺失或源文件更新过的
    python _tools/pack_music.py --force    # 全部重打
    python _tools/pack_music.py --whole    # 另外打一个整库 zip（放到站点之外分发）
"""

import argparse
import os
import sys
import zipfile

ROOM = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "room")
MUSIC_DIR = os.path.join(ROOM, "assets", "music")
PACK_DIR = os.path.join(MUSIC_DIR, "pack")
AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".ogg", ".oga", ".flac", ".aac", ".opus", ".webm"}
PAGES_LIMIT = 25 * 1024 * 1024
NOTE = "解压后得到一首原始音频文件，可在唱片柜「导入音乐」里选它导入；文件只留在本机浏览器里。\n"


def tracks():
    if not os.path.isdir(MUSIC_DIR):
        return []
    names = [
        n for n in sorted(os.listdir(MUSIC_DIR), key=str.lower)
        if os.path.isfile(os.path.join(MUSIC_DIR, n)) and os.path.splitext(n)[1].lower() in AUDIO_EXTS
    ]
    return names


def pack_one(name, force=False):
    src = os.path.join(MUSIC_DIR, name)
    dst = os.path.join(PACK_DIR, os.path.splitext(name)[0] + ".zip")
    if not force and os.path.isfile(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return None
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.write(src, name)
        z.writestr("解压说明.txt", NOTE)
    return dst


def pack_whole(names):
    dst = os.path.join(PACK_DIR, "lumina-music-full.zip")
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_STORED, allowZip64=True) as z:
        for name in names:
            z.write(os.path.join(MUSIC_DIR, name), name)
        z.writestr("解压说明.txt", NOTE)
    return dst


def main():
    parser = argparse.ArgumentParser(description="逐首打包窗畔曲库")
    parser.add_argument("--force", action="store_true", help="重打所有 zip")
    parser.add_argument("--whole", action="store_true", help="额外打一个整库 zip（不进站点产物）")
    args = parser.parse_args()

    names = tracks()
    if not names:
        print("没找到音频文件：{}".format(MUSIC_DIR))
        return 1
    os.makedirs(PACK_DIR, exist_ok=True)

    made = skipped = 0
    over = []
    for name in names:
        out = pack_one(name, args.force)
        if out is None:
            skipped += 1
            continue
        made += 1
        size = os.path.getsize(out)
        if size >= PAGES_LIMIT:
            over.append((os.path.basename(out), size))
    print("逐首打包完成：新建/更新 {}，跳过 {}，共 {} 首。".format(made, skipped, len(names)))
    if over:
        print("以下单包超过 25 MiB，不能放进 Pages 产物：")
        for f, s in over:
            print("  {} · {:.1f} MiB".format(f, s / 1048576.0))
    else:
        print("全部单包都在 25 MiB 以内。")

    if args.whole:
        out = pack_whole(names)
        print("整库包：{} · {:.1f} MB".format(out, os.path.getsize(out) / 1048576.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
