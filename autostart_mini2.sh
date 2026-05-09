#!/bin/bash
# Executado pelo LaunchAgent após login — não abre terminal
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

DIR="$(cd "$(dirname "$0")" && pwd)"

# Aguarda rede e sistema estabilizarem (Mini 2 espera um pouco mais que o Mini 1)
sleep 25

# Mata qualquer instância anterior
/opt/homebrew/bin/pm2 kill 2>/dev/null || /usr/local/bin/pm2 kill 2>/dev/null
sleep 2

# Inicia slave
cd "$DIR"
/opt/homebrew/bin/pm2 start ecosystem.mini2.config.js 2>/dev/null || \
/usr/local/bin/pm2 start ecosystem.mini2.config.js
