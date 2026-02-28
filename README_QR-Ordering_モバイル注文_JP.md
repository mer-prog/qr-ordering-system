# 純喫茶モバイルオーダー — QRコードで卓上注文を完結するリアルタイムWebアプリ

> **何を:** QRコードを読み取るだけで、スマホからメニュー閲覧・注文・厨房連携まで完結するモバイルオーダーシステム
> **誰に:** 小規模な喫茶店・カフェのオペレーション効率化を実現したいオーナー向け
> **技術:** HTML / CSS / JavaScript（ES Modules） + Firebase Firestore（リアルタイムDB）

- **ソースコード:** [github.com/mer-prog/qr-ordering-system](https://github.com/mer-prog/qr-ordering-system)

---

## 1. このプロジェクトで証明できるスキル

| スキル | 実装内容 |
|--------|----------|
| リアルタイムデータ同期 | Firestore `onSnapshot` による注文・メニューの即時反映（客側↔厨房が同期） |
| モバイルファーストUI設計 | Tailwind CSS + カスタムCSS によるスマホ最適化レイアウト、タッチ操作対応 |
| セキュリティ対策 | XSS対策（`escapeHTML` / `sanitizeImageSrc` / `sanitizeId`）、Firestoreルールによるデータ検証、入力バリデーション |
| バイリンガル対応 | JP/EN切替ボタン + MyMemory翻訳API + `localStorage` キャッシュによる自動翻訳機構 |
| フルCRUD管理画面 | メニューの追加・編集・削除・並び替え（ドラッグ&ドロップ + ボタン操作）を備えた管理ダッシュボード |
| データ駆動カテゴリ設計 | カテゴリをメニューデータから動的に生成（専用コレクション不要）、管理画面からカテゴリの追加・並び替えが可能 |
| テーマ性のあるUI実装 | 昭和レトロ喫茶をモチーフにした紙テクスチャ・CRTアニメーション・切符パンチ風エフェクト |

---

## 2. 課題 → 解決策

| 課題 | 解決策 |
|------|--------|
| 紙の伝票は書き間違い・読み間違いが発生する | スマホからの直接入力で注文内容をデジタル化 |
| ホールスタッフが注文を取りに行く往復時間 | QRコード → スマホ注文で客自身が直接注文 |
| 厨房への注文伝達にタイムラグがある | Firestoreのリアルタイム同期で注文即時反映 |
| 外国人客がメニューを読めない | JP/EN切替と自動翻訳APIによるバイリンガル対応 |
| メニュー変更のたびに印刷し直す手間 | 管理画面からリアルタイムでメニューを更新可能 |
| 会計時の手計算ミス | テーブル別自動集計で正確な会計を実現 |

---

## 3. 技術スタック

| カテゴリ | 技術 | 用途 |
|----------|------|------|
| マークアップ | HTML5 | セマンティック構造、ES Modules対応 |
| スタイリング | Tailwind CSS（CDN） + カスタムCSS | レスポンシブレイアウト、レトロテーマエフェクト |
| フロントエンド | JavaScript（ES Modules） | アプリロジック、DOM操作、状態管理 |
| データベース | Firebase Firestore | リアルタイムNoSQL、`onSnapshot` による双方向同期 |
| フォント | Google Fonts（Noto Serif JP / Kaisei Decol） | レトロ喫茶の雰囲気を演出する和文セリフ書体 |
| QRコード | qrcodejs（CDN） | テーブル別QRコード生成（1〜8卓対応） |
| 翻訳 | MyMemory Translation API | 日本語→英語の自動翻訳（`localStorage` キャッシュ付き） |
| ローカルサーバー | Python3 `http.server` | ゼロ依存のローカル開発サーバー |

---

## 4. システムアーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                  クライアント層                        │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ index.html   │  │ admin.html   │  │qr-codes.html│ │
│  │ (客側注文)    │  │ (厨房管理)    │  │ (QR生成)     │ │
│  │ + app.js     │  │              │  │              │ │
│  └──────┬───────┘  └──────┬───────┘  └─────────────┘ │
│         │                 │                            │
│         ▼                 ▼                            │
│  ┌──────────────────────────────────┐                  │
│  │       db-service.js              │                  │
│  │  (Firestore操作の抽象化層)        │                  │
│  │  addOrder / subscribeToOrders    │                  │
│  │  updateOrderStatus / deleteOrder │                  │
│  │  CRUD: menu コレクション          │                  │
│  └──────────────┬───────────────────┘                  │
│                 │                                      │
│  ┌──────────────┴───────────────────┐                  │
│  │     firebase-config.js           │                  │
│  │  (Firebase初期化・Firestore接続)  │                  │
│  └──────────────┬───────────────────┘                  │
└─────────────────┼───────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────┐
│              Firebase Firestore                      │
│                                                      │
│  ┌─────────────┐     ┌──────────────┐                │
│  │ menu        │     │ orders       │                │
│  │ コレクション  │     │ コレクション   │                │
│  │             │     │              │                │
│  │ - name      │     │ - tableId    │                │
│  │ - price     │     │ - items[]    │                │
│  │ - type      │     │ - status     │                │
│  │ - options[] │     │ - timestamp  │                │
│  └─────────────┘     └──────────────┘                │
│                                                      │
│  firestore.rules（セキュリティルール）                  │
└─────────────────────────────────────────────────────┘
```

---

## 5. 主要機能

### 5.1 注文フロー（客側: `index.html` + `app.js`）

- **テーブル識別:** URLクエリパラメータ `?table=1` でテーブル番号を自動取得
- **メニュー表示:** Firestoreからリアルタイム取得、カテゴリ別に自動グループ化
- **数量操作:** +/- ボタンで数量変更、選択済みアイテムに視覚フィードバック（パンチマーク + 赤ボーダー）
- **セットメニュー:** サンドイッチ等のオプション選択モーダル（たまご / ポテト / ハム）
- **モーニング価格:** 9:00〜12:00の間、`priceMorning` フィールドの割引価格を自動適用（`isMorningTime()`）
- **注文送信:** Firestoreへ注文データを書き込み → CRTアニメーション → 完了モーダル表示
- **合計金額:** カートの合計金額をリアルタイム計算・表示

### 5.2 バイリンガル対応

- **JP/EN切替ボタン:** ヘッダー右上のトグルボタンで即時切替
- **多層フォールバック:** Firestoreの `nameEn` / `descEn` フィールド → MyMemory翻訳API → 日本語原文
- **翻訳キャッシュ:** `localStorage` に翻訳結果を保存、API呼び出しを最小化
- **バッチ翻訳:** 5件ずつ並列でAPIリクエスト（レート制限回避）
- **静的テキスト切替:** ヘッダー、ボタンラベル等のUI要素も言語に応じて変更

### 5.3 厨房・管理ダッシュボード（`admin.html`）

**オーダー管理タブ:**
- **3カラムカンバン:** 調理待ち → 提供済み・未会計 → 会計済み（履歴）
- **ステータス遷移:** `pending` → `served` → `paid` の一方向フロー
- **テーブル別伝票:** 提供済み注文をテーブル単位でグループ化、合計金額を自動計算
- **売上表示:** 本日の売上合計をリアルタイム表示
- **履歴フィルタ:** 日付ピッカー + 前日/翌日ボタンで会計履歴を絞り込み
- **リアルタイム時計:** 厨房用の現在時刻表示

**メニュー管理タブ:**
- **フルCRUD:** メニューの追加・編集・削除
- **カテゴリ管理:** 既存カテゴリの選択 + 新規カテゴリの作成
- **並び替え:** ▲▼ボタンによるアイテム・カテゴリの順序変更、ドラッグ&ドロップ対応
- **画像アップロード:** ファイル選択 → Base64変換 → 300px以下にリサイズ → Firestoreに保存
- **朝価格設定:** チェックボックスで朝価格フィールドの表示/非表示を切替
- **セットオプション:** サンドイッチの種類など、動的にオプションを追加・削除
- **トースト通知:** 操作結果のフィードバック表示

### 5.4 QRコード生成（`qr-codes.html`）

- テーブル1〜8のQRコードを一括生成
- ベースURLを現在のサーバーアドレスから自動検出
- URL入力欄からベースURLの変更・再生成が可能
- 印刷用CSSで不要な要素を非表示（`@media print`）

### 5.5 メニューデータ投入（`seed-menu.html`）

- Firestoreの `menu` コレクションに初期データを一括投入
- 既存データの重複チェック（投入前にコレクションサイズを確認）
- ターミナル風UI（黒背景 + 緑文字）で進捗をリアルタイム表示
- 初期メニュー: 飲み物4種、食事4種、セット2種（計10品）

---

## 6. データモデル

### `menu` コレクション

```typescript
interface MenuItem {
  name: string;           // 商品名（日本語）例: "ブレンド珈琲"
  nameEn: string;         // 商品名（英語）例: "Blend Coffee"
  price: number;          // 通常価格（円）例: 450
  priceMorning: number | null;  // モーニング価格（円）例: 700（9-12時適用）
  desc: string;           // 説明文（日本語）例: "深煎りのコクと香り"
  descEn: string;         // 説明文（英語）例: "Dark roast with rich aroma"
  type: string;           // カテゴリキー 例: "drink" | "food" | "morning"
  typeName: string;       // カテゴリ表示名（日本語）例: "飲み物（ホット・アイス）"
  typeNameEn: string;     // カテゴリ表示名（英語）例: "Drinks (Hot/Ice)"
  typeOrder: number;      // カテゴリ表示順 例: 0, 10, 20
  image: string;          // 画像（相対パス or Base64 data URI）
  order: number;          // カテゴリ内の表示順
  hasOptions: boolean;    // セットオプションの有無
  options: Option[];      // オプション配列（hasOptions=true時のみ使用）
  createdAt: Timestamp;   // 作成日時（serverTimestamp）
  updatedAt?: Timestamp;  // 更新日時（更新時のみ）
}

interface Option {
  id: string;             // オプションID 例: "egg"
  name: string;           // オプション名（日本語）例: "たまご"
  nameEn: string;         // オプション名（英語）例: "Egg"
}
```

### `orders` コレクション

```typescript
interface Order {
  tableId: number;        // テーブル番号（1〜100）
  items: OrderItem[];     // 注文アイテム配列（1〜50件）
  status: 'pending' | 'served' | 'paid';  // 注文ステータス
  timestamp: Timestamp;   // 注文日時（serverTimestamp）
  paidAt?: Timestamp;     // 会計日時（status='paid'時に記録）
}

interface OrderItem {
  id: string;             // アイテムID（最大100文字）
  name: string;           // 商品名（最大200文字）
  nameEn: string;         // 商品名英語（最大200文字）
  price: number;          // 単価（円）
  quantity: number;       // 数量（1〜99）
}
```

---

## 7. デザインシステム

### 客側注文画面（昭和レトロ喫茶テーマ）

| 要素 | 値 | 用途 |
|------|-----|------|
| `retro-cream` | `#FDF5E6` | 背景色（古い紙の色） |
| `retro-brown` | `#4B3621` | 文字色・ボーダー色（焦げ茶） |
| `retro-red` | `#A40000` | アクセント色（価格、選択状態） |
| `retro-dark` | `#2A1F1B` | 濃い背景（ボタン影、QRコード） |
| フォント | Noto Serif JP | 和文セリフ体（レトロ感） |

**ビジュアルエフェクト:**
- **紙テクスチャ:** SVGの `feTurbulence` フィルターで紙の粒感をオーバーレイ
- **CRTアニメーション:** 注文送信時にブラウン管テレビの電源OFF風エフェクト
- **切符パンチ:** 選択されたメニューに穴あきパンチ風の丸マーク表示
- **セピアフィルター:** メニュー画像に軽いセピア調フィルター適用
- **3Dボタン:** 注文ボタンに `border-b-4` + `translate-y` で立体感を表現

### 管理画面（黒板テーマ）

| 要素 | 値 | 用途 |
|------|-----|------|
| 背景色 | `#2b2b2b` | 黒板風の暗い背景 |
| アクセント | `#fbbf24`（amber） | タブ選択・カテゴリヘッダー |
| 伝票（未提供） | `#fdf6e3` | クリーム色の紙風カード |
| 伝票（提供済み） | `#e0f2f1` | シアン色の伝票カード |
| フォント | Kaisei Decol | 手書き風の和文書体 |

---

## 8. プロジェクト構成

```
qr-ordering-system/
├── index.html           # 客側注文ページ（モバイルファースト）
├── admin.html           # 厨房・管理ダッシュボード（2タブ構成）
├── qr-codes.html        # テーブル別QRコード生成・印刷
├── seed-menu.html       # メニュー初期データ投入ツール
├── app.js               # 客側アプリケーションロジック（注文・翻訳・カート）
├── db-service.js        # Firestore操作の抽象化層（CRUD + リアルタイム購読）
├── firebase-config.js   # Firebase初期化・Firestore接続設定
├── firestore.rules      # Firestoreセキュリティルール
├── styles.css           # カスタムCSS（レトロエフェクト・アニメーション）
├── start-server.sh      # ローカル開発サーバー起動スクリプト
├── images/
│   └── placeholder.png  # メニュー画像プレースホルダー
├── .gitignore           # Git除外設定
└── README.md            # プロジェクト概要
```

---

## 9. セットアップ

### ローカル起動手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/mer-prog/qr-ordering-system.git
cd qr-ordering-system

# 2. 起動スクリプトを実行（Python3が必要）
chmod +x start-server.sh
./start-server.sh

# 3. ブラウザで以下にアクセス
#    客側注文:  http://localhost:8080/index.html?table=1
#    管理画面:  http://localhost:8080/admin.html
#    QRコード:  http://localhost:8080/qr-codes.html
```

### 初回セットアップ（メニューデータ投入）

```bash
# ブラウザで以下にアクセスし「データを投入する」ボタンをクリック
http://localhost:8080/seed-menu.html
```

### スマホからの動作確認

1. PCとスマホを**同じWi-Fiネットワーク**に接続
2. PCのローカルIPアドレスを確認（macOS: `ipconfig getifaddr en0`）
3. `qr-codes.html` のベースURLをローカルIPに変更して再生成
4. スマホのカメラでQRコードを読み取ってアクセス

---

## 10. セキュリティ & 本番ロードマップ

### 現在のセキュリティ対策

| 対策 | 実装箇所 |
|------|----------|
| XSSサニタイズ | `escapeHTML()` / `sanitizeImageSrc()` / `sanitizeId()` — `app.js`, `admin.html` |
| Firestoreルール | `menu`: 読取=全許可、書込=データ検証（name/price/type必須、型・長さチェック） |
| 注文作成検証 | `orders`: tableId(1-100)、items(1-50件)、status='pending'のみ許可 |
| 注文更新制限 | 更新可能フィールドは `status` と `paidAt` のみ |
| 注文削除禁止 | Firestoreルールで `delete: if false` を設定（履歴保護） |
| 入力サニタイズ | `db-service.js` で文字列長制限（name: 200文字、id: 100文字）、数値範囲制限（quantity: 1-99） |
| セキュリティヘッダー | `X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer` |
| 画像バリデーション | ファイル形式（JPEG/PNG/GIF/WebPのみ）、サイズ上限（1MB）、リサイズ（300px） |

### 本番環境に向けた強化計画

| 項目 | 内容 |
|------|------|
| 認証 | Firebase Authentication を導入し管理画面へのアクセスを制限 |
| ホスティング | Firebase Hosting でHTTPS配信（CDN経由） |
| 画像ストレージ | Firebase Storage に移行しBase64依存を解消 |
| 環境変数 | Firebase設定値を環境変数に切り出し |

---

## 11. 設計判断の根拠

| 判断 | 根拠 |
|------|------|
| ビルドツールなし（Vite/Webpack不使用） | CDN経由のTailwind CSS + ES Modulesで十分機能し、セットアップの複雑さを排除 |
| Firebase Firestoreの採用 | バックエンドサーバー不要でリアルタイム同期を実現、無料枠で小規模店舗の運用をカバー |
| Base64での画像保存 | Firebase Storageの追加設定なしで画像をFirestoreドキュメントに直接保存（300px以下にリサイズ） |
| カテゴリの動的生成 | 専用コレクションを持たず、メニューデータの `type` / `typeName` / `typeOrder` から自動生成しスキーマを簡素化 |
| MyMemory翻訳API | 無料・登録不要の翻訳APIで手軽にバイリンガル対応を実現、LocalStorageキャッシュでAPI呼び出しを削減 |
| Python3 http.server | Node.js不要、OS標準のPython3だけでローカル開発環境を構築 |
| セットオプションの実装 | `hasOptions` フラグ + `options` 配列でメニューアイテムに紐づけ、別コレクション不要 |

---

## 12. 運用コスト

| サービス | プラン | 月額 |
|----------|--------|------|
| Firebase Firestore | Spark（無料枠） | ¥0 |
| Firebase Hosting | Spark（無料枠） | ¥0 |
| Google Fonts | 無料 | ¥0 |
| Tailwind CSS CDN | 無料 | ¥0 |
| qrcodejs CDN | 無料 | ¥0 |
| MyMemory翻訳API | 無料枠（1日1000リクエスト） | ¥0 |
| **合計** | | **¥0** |

> Firestoreの無料枠: 読取 50,000回/日、書込 20,000回/日、削除 20,000回/日。小規模喫茶店の運用には十分な容量。

---

## 13. 作者

[@mer-prog](https://github.com/mer-prog)
