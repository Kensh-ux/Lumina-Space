# 音频来源与处理参数

> 版本：v1.2（2026-10-26）
> 用途：登记三段循环声景的出处与处理参数，便于复现与替换。
> 关联：`CHANGELOG.md` v1.2.0、`src/lib/audio.ts` 的 `NOISE_PROFILES`

---

## 一、三段声景

| 情绪 | 声景 | 源视频（B 站） | UP 主 | 源时长 |
|---|---|---|---|---|
| 积极 | 林间鸟鸣 | [BV1WYbpzcEXz](https://www.bilibili.com/video/BV1WYbpzcEXz/) P1 | 冥想疗愈音乐 | 59.8 分钟 |
| 中性 | 蓝调东京夜驶（放松 Lofi 旋律） | [BV1FdMczVEZU](https://www.bilibili.com/video/BV1FdMczVEZU/) **P1** | 阿鮑（Abao Vision） | 72.2 分钟 |
| 消极 | 平静雨声 | [BV1ji4y1Y77p](https://www.bilibili.com/video/BV1ji4y1Y77p/) P1 | 账号已注销 | 44.5 分钟 |

---

## 二、取流方式

通过 B 站 `playurl` 接口取 DASH 音频流（`fnval=16`，取码率最高的一路），不带登录 cookie；
优先选用 `upos-*` 镜像（`mcdn` 类 PCDN 节点在部分网络下不可达）。再经 ffmpeg 7.0.2 处理。

---

## 三、处理参数

| 步骤 | 做法 |
|---|---|
| 选段 | 先顺序扫全片算逐秒 RMS 报异常；再按策略选窗口 |
| 切口 | 在选段 ±25 秒内以 0.5 秒步长搜索，取「环形接缝样本差」最小的切口 |
| 无缝环 | 取循环体 B（1200s）与淡化窗 X（3s），收尾 = X×(1−w) + B[:3s]×w，w 为升余弦 |
| 循环长度 | 1203.0 秒（20 分 03 秒） |
| 响度 | `loudnorm=I=<目标>:TP=-1.5:LRA=11`（单遍） |
| 编码 | `libmp3lame` 128 kbps CBR，44.1 kHz，立体声 |

| 声景 | 选段策略 | 采用起点 | 响度目标 | 实测 I | 实测真峰 | 无削顶 | 回绕跳变 |
|---|---|---|---|---|---|---|---|
| 林间鸟鸣 | 活动密度最高（鸟叫稀疏，不能用「最平稳」） | 39:11 | −21.5 LUFS | −20.8 | −1.6 dBFS | 是 | −41.9 dBFS |
| 蓝调东京夜驶 | 最平稳 ＋ 切口先落在局部能量最低点（音乐轨，避免切在拍子上） | 27:22 | −23.0 LUFS | −23.1 | −2.3 dBFS | 是 | −39.9 dBFS |
| 平静雨声 | 最平稳 | 18:03 | −20.0 LUFS | −20.1 | −1.8 dBFS | 是 | −38.7 dBFS |

> 回绕跳变判据：循环结尾接回开头处的样本跳变，应**小于素材自身的最大瞬态**，
> 否则会在每次循环时听到咔哒。

---

## 四、源码位置

处理脚本（可复现，需 python3 + numpy + imageio-ffmpeg）：

```
05_暂存/_bili_probe/probe3.py       查看视频分 P 与音轨
05_暂存/_bili_probe/fetch_bili.sh   下载音轨（优先 upos 镜像）
05_暂存/_bili_probe/process_audio.py  选段 / 无缝环 / 响度 / 编码
05_暂存/_bili_probe/verify_audio.py   客观复核
```

处理报告：`05_暂存/_bili_probe/out/process_report.json`
频谱图：`03_测试地点/02_Lumina-Space_2026-10-24/01_音频复核/频谱_*.png`

---

## 五、托管

音频托管在 GitHub Releases，tag `audio-v1.2`，仓库本身不存二进制：

```
https://github.com/Kensh-ux/Lumina-Space/releases/download/audio-v1.2/bird-forest.mp3
https://github.com/Kensh-ux/Lumina-Space/releases/download/audio-v1.2/dusk-twilight.mp3
https://github.com/Kensh-ux/Lumina-Space/releases/download/audio-v1.2/rain-calm.mp3
```