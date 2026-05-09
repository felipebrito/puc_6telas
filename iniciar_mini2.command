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
pkill -9 -f "node" 2>/dev/null
pkill -9 -f mpv    2>/dev/null
sleep 2

# Detecta índice de cada tela pela posição X
echo "→ Detectando posição dos monitores..."
SCREEN_MAP=$(swift -e '
import Cocoa
for (i, s) in NSScreen.screens.enumerated() {
    print(i, Int(s.frame.origin.x))
}
')

get_idx() {
  echo "$SCREEN_MAP" | awk -v x="$1" '$2==x {print $1}'
}

IDX1=$(get_idx 0)
IDX2=$(get_idx 1080)
IDX3=$(get_idx 2160)

echo "  Tela 4 (x=0)    → screen=$IDX1"
echo "  Tela 5 (x=1080) → screen=$IDX2"
echo "  Tela 6 (x=2160) → screen=$IDX3"

# Inicia slave em background
echo "→ Iniciando slave (telas 4-6)..."
MASTER_IP="http://192.168.0.1:3000" \
VIDEO_1_PATH="$DIR/videos/screen_4.mp4" \
VIDEO_2_PATH="$DIR/videos/screen_5.mp4" \
VIDEO_3_PATH="$DIR/videos/screen_6.mp4" \
SCREEN1_IDX=$IDX1 SCREEN2_IDX=$IDX2 SCREEN3_IDX=$IDX3 \
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
