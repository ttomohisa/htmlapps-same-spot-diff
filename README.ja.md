# Same Spot Diff

2枚の写真の撮影位置のズレをOpenCV WASMで自動補正してから、変化した場所だけを見つける完全ローカルのブラウザーツールです。

単純な画像差分では、カメラが数pxずれただけで画面全体が差分になります。Same Spot Diffは **ORB特徴点 → BFMatcher → RANSAC Homography → warpPerspective** で比較画像を基準画像へ合わせてから差分を計算します。

## 特徴

- 撮影位置・回転・軽い遠近差を自動補正
- **After撮影ガイド**: Beforeを半透明で重ねたカメラ画面で、同じ位置・角度に合わせてAfterを撮影
- 差分箇所を赤くハイライト
- 位置合わせ状態 / 変化率 / 変化箇所数を分かりやすく表示
- 主表示は「変化を見る」「位置合わせを確認」の2つに整理し、元画像の個別表示は補助メニューに収納
- Before / Afterスライダーと交互表示（Blink）で、目視でも変化を確認
- 結果画像はスマホのピンチ操作・ドラッグ、PCの＋/−・ドラッグで細部を確認
- 毎回変わる時計・反射などを「無視する範囲」として指定可能。枠表示だけを隠して比較結果をすっきり確認できます
- 「小さな変化を無視」は比較画像の大きさに合わせて内部しきい値を調整
- 感度、小さな差分の除外、明るさ差の軽減を調整
- 感度変更時は位置合わせを再利用して差分だけ高速再計算
- JPEG / PNG / WebP対応
- スマホ写真の縦向き表示に対応
- 入力画像は外部送信しない
- OpenCV JS/WASMも配布HTMLへ内包
- `dist/index.html` と `dist/index.self-extract.html` の2種類を生成
- 日本語 / English 切替
- ダークモードなし

## OpenCV WASMをGitHub Releaseから取り込む

このアプリは `htmlapps-opencv-wasm-builder` のGitHub ReleaseにあるOpenCV JS/WASMをビルド時に取り込みます。ローカルにbuilderリポジトリを置く必要はありません。

取得元は `opencv-release.json` に固定しています。初期値は次のとおりです。

```text
repository: ttomohisa/htmlapps-opencv-wasm-builder
tag: v1.0.0
profile: same-spot-diff
```

Windowsで次を実行してください。

```text
import-opencv.bat
```

スクリプトはGitHub Release APIからAsset一覧を取得し、まず `same-spot-diff` 専用ZIPを探します。専用Assetがまだ公開されていないReleaseでは `browser-kitty-full` にフォールバックし、その場合はWASMが大きくなる旨を警告します。

取り込み後は `vendor/opencv/` に次のファイルが入ります。

```text
vendor/opencv/
├─ opencv.js
├─ opencv_js.wasm
├─ manifest.json            # Release Assetに含まれる場合
├─ resolved-profile.json    # Release Assetに含まれる場合
└─ release-source.json      # 実際に取得したRelease/Assetを記録
```

別バージョンを試す場合だけ、一時的にタグを引数で指定できます。

```text
import-opencv.bat v1.0.1
```

正式に更新するときは `opencv-release.json` の `tag` を変更してください。OpenCVのJavaScriptとWASMは常に同じRelease Assetの組を取り込みます。

> ネットワークアクセスが必要なのはこの**ビルド前の取り込み処理だけ**です。生成した単一HTMLはOpenCV JS/WASMを内包し、実行時にGitHubやCDNへ接続しません。GitHub Actionsでもビルドする場合は、取り込み後の `vendor/opencv/opencv.js` と `vendor/opencv/opencv_js.wasm` をリポジトリへコミットしてください。

## 単一HTMLをビルド

Windowsで:

```text
build-standalone.bat
```

生成物:

```text
dist/
├─ index.html
├─ index.self-extract.html
├─ dependency-manifest.json
├─ build-size-report.json
└─ .nojekyll
```

OpenCVのJS/WASMはビルド時にgzip → Base64で**各assetを1回だけ**内包します。実行時のCDNアクセスはありません。

## 使い方

1. Before写真とAfter写真を追加
2. 「2枚を比較する」を押す
3. 「変化を見る」で赤いハイライトを確認
4. 必要なら「ズレを確認」で2枚の重なりを確認
5. 赤い表示が多すぎる・少なすぎる場合だけ、結果画像のすぐ下にある「結果を調整」を開く
6. 必要なら表示中の結果をPNG保存

## 向いている比較

- 部屋・家具のBefore / After
- 工事前後
- 掲示物や印刷物
- 商品・部品の外観
- 同じ方向から撮った設備写真

## 苦手な条件

Homographyは1枚の平面、またはカメラ回転中心に近い撮影を近似する手法です。次の条件では正しい位置合わせができない場合があります。

- 2枚の撮影位置が大きく違う
- 近景と遠景が混ざり、視差が大きい
- 模様がほとんどない壁など特徴点が少ない
- 片方だけ大きく隠れている
- 強い影、照明、反射の変化

結果は確認用途として使い、測量・検査の最終判定にはそのまま使わないでください。

## リポジトリ構成

```text
.
├─ APP_SPEC.md
├─ app.config.json
├─ dependencies.json
├─ opencv-release.json
├─ import-opencv.bat
├─ vendor/opencv/
├─ src/index.template.html
├─ build-standalone.bat
├─ build-standalone.ps1
├─ scripts/
├─ components/
└─ dist/
```

## ライセンス

アプリ本体: MIT License  
OpenCV: Apache License 2.0。詳細は `THIRD_PARTY_NOTICES.md` を参照してください。
