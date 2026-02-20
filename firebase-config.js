// firebase-config.js
// 井木様の環境に合わせて、CDN経由で読み込む設定にしています

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// スクリーンショットから転記した井木様の正確なキー情報
const firebaseConfig = {
  apiKey: "AIzaSyCllVVFZhd7wozV-HrqS0JL0Gk-VJjcB7U",
  authDomain: "aibuzz-retro-cafe.firebaseapp.com",
  projectId: "aibuzz-retro-cafe",
  storageBucket: "aibuzz-retro-cafe.firebasestorage.app",
  messagingSenderId: "265313379086",
  appId: "1:265313379086:web:ac767a79646d266cd96d5f"
};

// アプリを初期化（イグニッションON）
const app = initializeApp(firebaseConfig);

// データベースを初期化（ここが重要！）
const db = getFirestore(app);

// 他のファイル（db-service.jsなど）で使えるように db を送り出す
export { db };