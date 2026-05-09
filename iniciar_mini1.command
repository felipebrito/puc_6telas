#!/bin/bash
# ─────────────────────────────────────────────
#  PUC BIOMAS — Mac Mini 1 (Master + Telas 1-3)
# ─────────────────────────────────────────────

DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
NODE=$(which node)

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PUC BIOMAS — Mac Mini 1            ║"
echo "║   Master + Telas 1, 2 e 3            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Mata processos anteriores
echo "→ Encerrando processos anteriores..."
kill -9 $(lsof -i :3000 -t 2>/dev/null) 2>/dev/null
pkill -9 -f "node" 2>/dev/null
pkill -9 -f mpv    2>/dev/null
sleep 2

# Inicia master em background
echo "→ Iniciando master..."
"$NODE" "$DIR/master.js" > /tmp/puc_master.log 2>&1 &
MASTER_PID=$!
sleep 3

# Inicia slave em background
echo "→ Iniciando slave (telas 1-3)..."
MASTER_IP="http://127.0.0.1:3000" \
VIDEO_1_PATH="$DIR/videos/screen_1.mp4" \
VIDEO_2_PATH="$DIR/videos/screen_2.mp4" \
VIDEO_3_PATH="$DIR/videos/screen_3.mp4" \
SCREEN1_IDX=0 SCREEN2_IDX=1 SCREEN3_IDX=2 \
"$NODE" "$DIR/slave.js" > /tmp/puc_slave1.log 2>&1 &
SLAVE_PID=$!

echo ""
echo "✓ Mini 1 rodando! (master PID=$MASTER_PID, slave PID=$SLAVE_PID)"
echo ""
echo "Aguardando Mini 2 conectar..."
echo "(Mantenha esta janela aberta — fechar encerra o sistema)"
echo ""
echo "─── Logs ao vivo ────────────────────────"
tail -f /tmp/puc_master.log
