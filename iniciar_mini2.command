#!/bin/bash
# ─────────────────────────────────────────────
#  PUC BIOMAS — Mac Mini 2 (Telas 4-6)
#  Duplo clique para iniciar o sistema
#  IMPORTANTE: inicie o Mini 1 primeiro!
# ─────────────────────────────────────────────

cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PUC BIOMAS — Mac Mini 2            ║"
echo "║   Telas 4, 5 e 6                     ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Qual versão iniciar?"
echo "  1) v2.0 — recomendada (melhor sincronismo)"
echo "  2) v1.0 — versão estável anterior"
echo ""
read -p "Digite 1 ou 2 e pressione Enter: " VERSAO

# Garante que pm2 está no PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Para processos anteriores
echo ""
echo "→ Parando processos anteriores..."
pm2 kill 2>/dev/null
sleep 1

if [ "$VERSAO" = "2" ]; then
  echo "→ Iniciando v1.0..."
  pm2 start ecosystem.mini2.v1.config.js
  echo ""
  echo "✓ Mini 2 iniciado com v1.0!"
else
  echo "→ Iniciando v2.0..."
  pm2 start ecosystem.mini2.config.js
  echo ""
  echo "✓ Mini 2 iniciado com v2.0!"
fi

echo ""
echo "Conectando ao Mini 1..."
echo "(Feche esta janela quando quiser — o sistema continua rodando)"
echo ""

# Mostra logs ao vivo
pm2 logs slave-mini2 --lines 0
