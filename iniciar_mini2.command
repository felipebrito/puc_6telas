#!/bin/bash
# ─────────────────────────────────────────────
#  PUC BIOMAS — Mac Mini 2 (Telas 4-6)
#  Duplo clique para iniciar o sistema
#  IMPORTANTE: inicie o Mini 1 primeiro!
# ─────────────────────────────────────────────

cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PUC BIOMAS — Iniciando Mini 2      ║"
echo "║   Telas 4, 5 e 6                     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Garante que pm2 está no PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Para processos anteriores
echo "→ Parando processos anteriores..."
pm2 kill 2>/dev/null
sleep 1

# Inicia slave
echo "→ Iniciando sistema..."
pm2 start ecosystem.mini2.config.js

echo ""
echo "✓ Mini 2 iniciado!"
echo ""
echo "Conectando ao Mini 1..."
echo "(Feche esta janela quando quiser — o sistema continua rodando)"
echo ""

# Mostra logs ao vivo
pm2 logs slave-mini2 --lines 0
