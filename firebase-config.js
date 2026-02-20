// firebase-config.js
// 井木様の環境に合わせて、CDN経由で読み込む設定にしています

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Firebase設定
// ※ Firebase APIキーはFirebaseコンソールでドメイン制限を設定してください
const firebaseConfig = {
  apiKey: "AIzaSyCllVVFZhd7wozV-HrqS0JL0Gk-VJjcB7U",
  authDomain: "aibuzz-retro-cafe.firebaseapp.com",
  projectId: "aibuzz-retro-cafe",
  storageBucket: "aibuzz-retro-cafe.firebasestorage.app",
  messagingSenderId: "265313379086",
  appId: "1:265313379086:web:ac767a79646d266cd96d5f"
};

// アプリを初期化
const app = initializeApp(firebaseConfig);

// データベースを初期化
const db = getFirestore(app);

// 認証を初期化
const auth = getAuth(app);

// 他のファイルで使えるようにエクスポート
export { db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged };