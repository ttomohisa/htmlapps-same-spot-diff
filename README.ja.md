# Same Spot Diff

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-same-spot-diff/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-same-spot-diff/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-same-spot-diff/)

[English README](README.md)

Before / Afterの写真が少し違う位置から撮られていても、自動でズレを合わせてから「本当に変わった場所」を見つける、プライバシー重視の単一HTMLブラウザーツールです。

選んだ写真や比較結果は外部へアップロードせず、比較処理は端末内で完結します。

## 🚀 デモ

### [Same Spot DiffをGitHub Pagesで開く](https://ttomohisa.github.io/htmlapps-same-spot-diff/)

GitHub Pagesから最初のHTMLを読み込んだ後、位置合わせ、差分検出、無視範囲、スライダー表示、交互表示、拡大確認、PNG保存などはブラウザー内で処理します。選択した写真をアプリがサーバーへ送信することはありません。

## 主な機能

- 撮影位置・回転・軽い遠近差を自動で補正してから比較
- 変化した場所を赤く強調表示
- **前の変化 / 次の変化**で全変化を順に拡大し、現在位置と総数を表示
- ズレ補正の状態、変化した面積、変化箇所数を分かりやすく表示
- **After撮影ガイド**: Beforeをライブカメラへ半透明で重ね、同じ位置から撮りやすくする
- Before / Afterを境界線で見比べるスライダー表示
- Before / Afterを交互に切り替えるBlink表示
- 2枚を重ねてズレが残っていないか確認
- スマホではピンチズーム＋ドラッグ、PCでは＋/−＋ドラッグで細部を確認
- 時計、反射、画面、葉など毎回変わる場所を**無視する範囲**として指定
- 無視範囲は有効なまま、確認用の枠だけ非表示にできる
- 「小さな変化を無視」は比較画像サイズに合わせて内部しきい値を調整
- 結果のすぐ下で変化の拾いやすさ・明るさ差などを調整
- 差分設定だけ変更した場合は位置合わせ結果を再利用し、不要な再計算を減らす
- JPEG / PNG / WebP対応
- 表示中の結果をPNG保存
- ヘッダーのEN / JAで日本語・英語を切替（切替先の説明とヘルプも各言語で表示）
- SVG favicon内蔵
- OpenCV JavaScript / WebAssemblyを生成HTMLへ内包
- 実行時の分析ツール、アップロードAPI、CDN、GitHubダウンロードなし

## すぐ使う

### Web版を使う

[デモを開く](https://ttomohisa.github.io/htmlapps-same-spot-diff/)だけで使えます。インストールやアカウントは不要です。

### 単一HTMLを使う

1. このリポジトリをダウンロードまたはcloneします。
2. `dist/index.html` を現在のブラウザーで開きます。
3. BeforeとAfterを追加します。
4. **2枚を比較する**を押します。

通常の比較機能はローカルHTMLだけでも使えます。**After撮影ガイド**はブラウザーのカメラ機能を使うため、GitHub PagesなどHTTPSで開いた場合が最も確実です。

## 使い方

1. **Before**写真を追加します。
2. **After**写真を追加するか、**Beforeに合わせて撮影**で撮影位置を合わせながらAfterを撮ります。
3. **2枚を比較する**を押します。
4. まずは**変化を見る**で赤いハイライトを確認します。
5. 必要に応じて**ズレを確認**、**スライダーで見る**、**交互に見る**を使います。
6. 赤い表示が多すぎる・少なすぎるときだけ**結果を調整**を開きます。
7. 時計、反射、モニター、動く葉など毎回変わる場所は**無視する範囲**に指定します。
8. 拡大・移動して細部を確認し、必要なら現在の表示をPNG保存します。

### 変化を順に確認する

**次の変化**で最初の変化へ移動し、**次の変化 / 前の変化**で面積の大きい順に全箇所を確認できます。位置表示は0 / Nから始まり、先頭・末尾では移動ボタンが無効になります。赤枠を描画する最初の80箇所を超えた変化も対象です。**表示を戻す**で全体表示に戻り、位置もリセットします。表示モードを切り替えても位置は保持されます。

移動は既存の範囲内で拡大率と表示位置だけを変えます。保存PNGの切り抜き、統計、無視範囲、表示モードは変わりません。再比較・差分設定の変更・画像の変更では位置がリセットされます。

40MB以下の対応画像を選び直すと古い結果と無視範囲はすぐ消え、読み込み中は比較・保存できません。読み込みに失敗した場合は元の画像が残りますが、再比較が必要です。ファイル選択のキャンセル、非対応形式、サイズ超過では現在の有効な画像と結果が残ります。

### After撮影ガイド

同じ場所を後日もう一度撮る用途に向いています。

1. 先にBeforeを追加します。
2. After欄の**Beforeに合わせて撮影**を押します。
3. ブラウザーのカメラ利用を許可します。
4. ライブ映像にBeforeが半透明で重なるので、主な輪郭や角が合うように端末位置を調整します。
5. 必要ならBeforeの濃さを変えたり、一時的に非表示にします。
6. 撮影すると、その写真がそのままAfterへ追加されます。

ライブ映像と撮影した画像は端末内だけで扱います。カメラは撮影ガイドを開いている間だけ使用します。

### 結果の見方

| 表示 | 用途 |
| --- | --- |
| **変化を見る** | 検出した変化を赤く強調 |
| **ズレを確認** | 補正した2枚を重ねて残ったズレを確認 |
| **スライダーで見る** | 境界線を動かしてBefore / Afterを左右比較 |
| **交互に見る** | Before / Afterを交互表示して目視で変化を発見 |
| **元画像を個別に見る** | Beforeまたは補正後Afterだけを確認 |

### 無視する範囲

毎回変わる場所を比較対象から外す機能です。

- **範囲を追加**を押し、結果画像上をドラッグして指定します。
- **1つ戻す**、**すべて消す**で編集できます。
- **枠を隠す**は枠表示だけを消します。無視設定そのものは有効なままです。
- 新しく範囲を追加するときは、編集しやすいよう枠が自動で再表示されます。

## 向いている用途

- 部屋・家具のBefore / After
- 工事前後の記録
- 設備・施設の確認
- 店舗の陳列や掲示物
- 商品・部品の外観確認
- 同じ棚、壁、盤面、作業場所などの定点比較

## GitHub Pagesで公開

このリポジトリには、単一HTMLをビルド・検証して`dist`をGitHub Pagesへ公開するWorkflowが含まれています。

1. GitHubへ `htmlapps-same-spot-diff` としてpushします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選びます。
3. `main`へpushするか、Actionsから **Deploy standalone app to GitHub Pages** を手動実行します。
4. 成功すると `https://ttomohisa.github.io/htmlapps-same-spot-diff/` で利用できます。

GitHub Pagesがまだ有効化されていない場合でも、Workflowはビルド検証まで行い、初回設定手順を表示します。

## 開発・ビルド構成

```text
.
├─ src/index.template.html       # アプリ本体テンプレート
├─ app.config.json               # アプリ情報・ビルド設定
├─ dependencies.json             # 内包する依存関係
├─ opencv-release.json           # OpenCV builderのRelease/profile固定
├─ import-opencv.bat             # 固定ReleaseからOpenCVを取得
├─ vendor/opencv/                # 取り込んだOpenCV JS/WASM
├─ build-standalone.bat          # Windows用ビルド入口
├─ build-standalone.ps1          # 単一HTMLビルダー
├─ scripts/                      # 検証・補助スクリプト
├─ dist/index.html               # 読みやすい単一HTML
└─ dist/index.self-extract.html  # 小さめの自己展開単一HTML
```

## OpenCVを固定Releaseから取り込む

OpenCV JavaScript/WASMは [`htmlapps-opencv-wasm-builder`](https://github.com/ttomohisa/htmlapps-opencv-wasm-builder) の固定Releaseから取得します。

現在の固定値:

```text
repository: ttomohisa/htmlapps-opencv-wasm-builder
tag: v1.0.0
profile: same-spot-diff
```

Windowsで:

```bat
import-opencv.bat
```

このスクリプトは:

- `opencv-release.json` からrepository / tag / profileを読む
- `same-spot-diff` 専用Release Assetを優先
- 専用Assetがない場合だけ `browser-kitty-full` へフォールバック
- `opencv.js` と `opencv_js.wasm` を必ず同じRelease Assetから取得
- 実際に使ったRelease / Assetを `vendor/opencv/release-source.json` に記録

一時的に別Releaseを試す場合:

```bat
import-opencv.bat v1.0.1
```

正式な更新では `opencv-release.json` の `tag` を変更してください。

## 単一HTMLをビルド

OpenCVを取り込んだ後、Windowsで:

```bat
build-standalone.bat
```

生成物:

```text
dist/
├─ index.html
├─ index.self-extract.html
├─ dependency-manifest.json
├─ self-extract-manifest.json
├─ build-size-report.json
└─ .nojekyll
```

OpenCV JavaScript/WASMはgzip圧縮してHTMLへ内包します。実行時は埋め込んだWASMバイト列をメモリから直接初期化し、外部URLへ取りに行きません。

通常のWindowsビルドではPython、Node.js、ローカルWebサーバーは不要です。

## 内部の比較処理

画面上では専門用語をなるべく出しませんが、内部ではOpenCVを使って次の流れで処理します。

```text
Before / After
      ↓
ORB特徴点抽出
      ↓
BFMatcherで対応付け
      ↓
RANSAC Homography
      ↓
Perspective Warpで位置補正
      ↓
明るさ差を抑えた画像差分
      ↓
Threshold + Morphology
      ↓
無視範囲 + 小領域フィルタ
      ↓
変化箇所を強調表示
```

専用Release Assetが利用できる場合は、このアプリに必要なOpenCV機能だけを含むprofileを使用します。

## プライバシーと実行時通信

比較処理が端末内で完結するように構成しています。

- 選択した写真をアプリがアップロードしない
- OpenCV JavaScript / WebAssemblyを生成HTMLへ内包
- Content Security Policyに `connect-src 'none'` を設定
- WASMは外部URLからfetchせず、埋め込みデータから直接初期化
- 分析ツールや外部APIを比較処理に使用しない
- After撮影ガイドは、ユーザーが明示的に開いて権限を許可したときだけ `getUserMedia` を使用

GitHub Pages版では最初のHTML取得だけ通信が発生します。読み込み後、選択した写真をアプリがサーバーへ送ることはありません。完全オフラインで比較したい場合は `dist/index.html` をローカルで開けます。撮影ガイドの利用可否は、ブラウザーのHTTPS・カメラ権限ルールに依存します。

詳細は [SECURITY.md](SECURITY.md) と [VERIFY_OFFLINE.md](VERIFY_OFFLINE.md) を参照してください。

## 制限事項

- 撮影位置が大きく変わると、手前と奥で視差が異なり、1枚のHomographyでは補正しきれない場合があります。
- 無地の壁など模様や角が少ない写真では、位置合わせに必要な目印を十分に見つけられない場合があります。
- 大部分が隠れている、または構図が大きく変わった写真は位置合わせに失敗する場合があります。
- 強い影、照明、反射、動く葉、画面、時計などは変化として検出されることがあります。必要に応じて調整または無視範囲を使ってください。
- 大きな写真は端末メモリを多く使います。スマホで不安定な場合は**写真の細かさ**を軽めにしてください。
- After撮影ガイドにはカメラ対応・権限・通常はHTTPSなどのセキュアコンテキストが必要です。
- 自動差分は確認を補助する機能です。測量、品質検査、安全に関わる最終判定の代わりには使用しないでください。

## 依存関係

| Library | Version | License | Purpose |
| --- | ---: | --- | --- |
| OpenCV | 5.0.0 | Apache-2.0 | 画像の位置合わせ、遠近補正、差分処理 |

実際のruntimeは `opencv-release.json` で固定したbuilder Releaseから取得します。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

## Contributing

不具合報告や機能提案はGitHub Issuesから歓迎します。開発時の方針は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## License

Copyright © 2026 ttomohisa

[MIT License](LICENSE) で公開しています。

### 実行時の回帰テスト

Node.js 22以降で `node --test tests/*.test.cjs` を実行できます。npmのインストールは不要です。リポジトリ検査ではソース、読みやすい生成HTML、自己展開版の復元HTML、同梱の `same-spot-diff.html` を検査します。同梱版を更新する際はビルド後に `dist/index.html` を `same-spot-diff.html` へコピーしてください。テストは合成DOM/canvasと制御した画像読み込み・OpenCV境界を使い、実ブラウザー検査ではありません。`@napi-rs/canvas` がインストール済みなら `SAME_SPOT_REAL_CANVAS=1` で合成PNGの実バイト一致も検査できます。
