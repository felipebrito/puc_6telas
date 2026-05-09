#!/bin/bash
# ─────────────────────────────────────────────
#  PUC BIOMAS — Instala início automático
#  Execute UMA VEZ em cada Mac Mini
# ─────────────────────────────────────────────

DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PUC BIOMAS — Início Automático     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Detecta qual Mini é este
if [ -f "$DIR/master.js" ]; then
  SCRIPT="$DIR/iniciar_mini1.command"
  LABEL="PUC Biomas Mini 1"
else
  SCRIPT="$DIR/iniciar_mini2.command"
  LABEL="PUC Biomas Mini 2"
fi

chmod +x "$SCRIPT"

echo "→ Adicionando '$LABEL' aos itens de login..."

osascript << APPLESCRIPT
tell application "System Events"
    make new login item at end of login items with properties {path:"$SCRIPT", hidden:false, name:"$LABEL"}
end tell
APPLESCRIPT

echo ""
echo "✓ Instalado! A partir de agora o sistema inicia"
echo "  automaticamente quando o Mac for ligado."
echo ""
echo "  Para remover: Sistema > Geral > Itens de Login"
echo "  e apague '$LABEL'."
echo ""
read -p "Pressione Enter para fechar..."
