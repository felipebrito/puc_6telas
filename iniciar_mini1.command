#!/bin/bash
# ─────────────────────────────────────────────
#  PUC BIOMAS — Mac Mini 1 (Master + Telas 1-3)
#  Duplo clique para iniciar o sistema
# ─────────────────────────────────────────────

cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PUC BIOMAS — Iniciando Mini 1      ║"
echo "║   Master + Telas 1, 2 e 3            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Garante que pm2 está no PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Para processos anteriores
echo "→ Parando processos anteriores..."
pm2 kill 2>/dev/null
sleep 1

# Inicia master + slave
echo "→ Iniciando sistema..."
pm2 start ecosystem.mini1.config.js

echo ""
echo "✓ Mini 1 iniciado!"
echo ""
echo "Aguardando Mini 2 conectar..."
echo "(Feche esta janela quando quiser — o sistema continua rodando)"
echo ""

# Mostra logs ao vivo
pm2 logs master --lines 0
