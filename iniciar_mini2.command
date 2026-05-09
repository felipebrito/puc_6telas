#!/bin/bash
# ─────────────────────────────────────────────
#  PUC BIOMAS — Mac Mini 2 (Telas 4-6)
#  IMPORTANTE: Mini 1 deve estar ligado primeiro
# ─────────────────────────────────────────────

DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
NODE=$(which node)

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PUC BIOMAS — Mac Mini 2            ║"
echo "║   Telas 4, 5 e 6                     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Mata processos anteriores
echo "→ Encerrando processos anteriores..."
pkill -f "node slave.js" 2>/dev/null
pkill -f mpv             2>/dev/null
sleep 2

# Inicia slave em background
echo "→ Iniciando slave (telas 4-6)..."
MASTER_IP="http://192.168.0.1:3000" \
VIDEO_1_PATH="$DIR/videos/screen_4.mp4" \
VIDEO_2_PATH="$DIR/videos/screen_5.mp4" \
VIDEO_3_PATH="$DIR/videos/screen_6.mp4" \
"$NODE" "$DIR/slave.js" > /tmp/puc_slave2.log 2>&1 &
SLAVE_PID=$!

echo ""
echo "✓ Mini 2 rodando! (slave PID=$SLAVE_PID)"
echo ""
echo "Conectando ao Mini 1 (192.168.0.1)..."
echo "(Mantenha esta janela aberta — fechar encerra o sistema)"
echo ""
echo "─── Logs ao vivo ────────────────────────"
tail -f /tmp/puc_slave2.log
