# Changelog

## v2.0 — Sincronismo garantido + Plug & Play

### Novidades
- Scripts `.command` de duplo clique para iniciar em cada Mac Mini sem terminal
- Auto-start configurável via pm2 startup (liga e já roda)

### Correções
- Loop end: debounce aumentado para 5s — evita reset duplo quando ambos os Minis detectam a virada ao mesmo tempo
- `onAllIpcReady`: fallback seguro quando duração do vídeo ainda não foi reportada
- Master: `load` só é disparado na primeira inicialização — reconexão de slave não reinicia todos os mpvs
- Heartbeat: corrige drift em todas as 3 telas, não apenas a tela 0
- Teclado do mpv desabilitado — spacebar e outras teclas não quebram mais o sync

---

## v1.0 — Plano C: Timecode Atômico

### Arquitetura
- **Plano A** (split): 3 mpvs por Mac Mini, vídeos individuais por tela
- **Plano B** (wide): 1 mpv por Mac Mini cobrindo 3 telas com vídeo 3662×1920
- **Plano C** (ativo): timecode atômico via `play_at` epoch, sem gargalo de rede

### Como funciona
- Master emite `play_at: { epoch }` — cada slave calcula o delay exato localmente
- Heartbeat a cada 2s — slaves corrigem drift pelo relógio do sistema sem depender de report_time
- `loop_end`: slave detecta virada de loop e avisa master, que coordena reset atômico de todos
- Autodescoberta via UDP broadcast — slaves encontram o master sem configuração de IP manual
- Slaves aguardam `load` do master antes de iniciar mpv — evita dupla inicialização
- Play só enviado quando todos os IPCs do slave estão conectados — sincronismo dentro do mesmo Mac Mini

### Infraestrutura
- 2 Mac Minis, 3 telas cada, total 6 telas
- Mini 1 (192.168.0.1): roda master + slave (telas 1–3)
- Mini 2 (192.168.0.2): roda slave (telas 4–6)
- pm2 para gerenciamento de processos
