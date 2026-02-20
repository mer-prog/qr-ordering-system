#!/bin/bash
# スマホ確認用サーバー起動スクリプト
# 使い方: ターミナルで ./start-server.sh を実行

PORT=8080
IP=$(ipconfig getifaddr en0 2>/dev/null || echo "IPアドレス取得失敗")

echo ""
echo "========================================="
echo "  純喫茶 モバイルオーダー サーバー起動"
echo "========================================="
echo ""
echo "  📱 スマホからアクセス:"
echo "     http://${IP}:${PORT}/index.html"
echo ""
echo "  📋 QRコード一覧:"
echo "     http://${IP}:${PORT}/qr-codes.html"
echo ""
echo "  🖥️  管理画面:"
echo "     http://${IP}:${PORT}/admin.html"
echo ""
echo "  停止するには Ctrl+C を押してください"
echo "========================================="
echo ""

cd "$(dirname "$0")"
python3 -m http.server ${PORT} --bind 0.0.0.0
