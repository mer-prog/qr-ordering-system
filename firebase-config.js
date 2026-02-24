// firebase-config.js
// CDN経由で読み込むFirebase設定

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase プロジェクト設定
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