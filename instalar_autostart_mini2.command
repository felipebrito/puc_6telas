#!/bin/bash
# ─────────────────────────────────────────────
#  PUC BIOMAS — Instala autostart no Mac Mini 2
#  Execute UMA VEZ após configurar o sistema
# ─────────────────────────────────────────────

DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PUC BIOMAS — Instalar Autostart    ║"
echo "║   Mac Mini 2                         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Permissão de execução
chmod +x "$DIR/autostart_mini2.sh"

# Cria o LaunchAgent
PLIST="$HOME/Library/LaunchAgents/com.puc.biomas.mini2.plist"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.puc.biomas.mini2</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$DIR/autostart_mini2.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/puc_biomas_mini2.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/puc_biomas_mini2_error.log</string>
</dict>
</plist>
EOF

# Carrega o agente
launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST"

echo "✓ Autostart instalado!"
echo ""
echo "A partir de agora, ao ligar o Mac Mini 2,"
echo "o sistema inicia automaticamente após o login."
echo ""
echo "Log em: /tmp/puc_biomas_mini2.log"
echo ""
read -p "Pressione Enter para fechar..."
