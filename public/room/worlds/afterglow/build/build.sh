#!/usr/bin/env bash
# 构建单文件 HTML：先打包 JS，再内联所有资源。
set -euo pipefail
cd "$(dirname "$0")/.."

npx --no-install esbuild src/main.js \
  --bundle \
  --format=iife \
  --minify \
  --target=es2019 \
  --alias:three=./vendor/three.module.js \
  --outfile=build/app.min.js \
  --log-level=warning

py -3 build/inline.py
