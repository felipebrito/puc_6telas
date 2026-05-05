# PUC - Biomas 6 Telas (Sincronização de Vídeo)

Esta solução permite sincronizar 6 telas usando 2 Mac Minis. Ela utiliza o `mpv` (um player de vídeo leve e de alto desempenho) sendo controlado remotamente via IPC (Inter-Process Communication) através de um script Node.js usando Sockets.

## Arquitetura
1. **Master (Controlador)**: Um script `master.js` que roda em apenas **um** computador (pode ser um dos Mac Minis ou um computador extra) e envia comandos (play, pause, seek) para todos os outros via rede.
2. **Slave (Player)**: Um script `slave.js` que roda em **cada um dos 2 Mac Minis**. Ele abre três instâncias do `mpv` (uma em cada saída de vídeo) e obedece os comandos do Master instantaneamente.

## Pré-requisitos (Em todos os Mac Minis)

1. **Instalar Homebrew** (se já não tiver):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Instalar o `mpv`** e Node.js:
   ```bash
   brew install mpv node
   ```

3. **Sincronização PTP (Opcional, mas recomendado para frame-sync perfeito):**
   Como os Mac Minis estão em rede cabeada Gigabit, ligue o PTP para ter relógios idênticos:
   Vá em Preferências do Sistema -> Compartilhamento -> Marque a opção de servir como Time Server (No master) e nos Slaves configure para sincronizar o horário via rede com o IP do Master.
   
## Instalação do Projeto
Copie esta pasta para os computadores. Dentro da pasta, rode:
```bash
npm install
npm install pm2 -g
```

## Configuração

- Edite o arquivo `ecosystem.config.js` em cada Mac Mini (Slave).
- Altere `MASTER_IP` para o IP da máquina na rede local que vai rodar o Master (Ex: `http://192.168.1.10:3000`).
- Altere os caminhos dos vídeos `VIDEO_1_PATH`, `VIDEO_2_PATH` e `VIDEO_3_PATH` para apontar para os 3 vídeos que aquele Mac Mini deve tocar em cada uma das suas telas.
- Nota: A flag `--screen=0`, `--screen=1` e `--screen=2` no `slave.js` define em qual monitor cada vídeo irá abrir.

## Como Executar

### Na máquina Mestre (Controladora)
Abra o terminal, vá para a pasta do projeto e rode:
```bash
node master.js
```
Isso abrirá um console interativo.

### Nas máquinas "Slave" (Os 2 Mac Minis)
Na pasta do projeto, inicie os players usando o PM2 para garantir que continuem rodando:
```bash
pm2 start ecosystem.config.js --only slave
```
*(O PM2 pode ser configurado para rodar no boot da máquina com o comando `pm2 startup` e `pm2 save`)*

## Controles
No terminal onde o `master.js` está rodando, digite:
- `play` (Toca tudo instantaneamente)
- `pause` (Pausa tudo)
- `seek 10` (Pula para o segundo 10 em todos os vídeos simultaneamente)
- `load` (Reinicia e recarrega os players)

## Observações sobre performance
A latência do Socket.io em uma LAN local é de ~1 a 2 milissegundos. Junto do mpv que usa decodificação via hardware, você terá uma sincronia extremamente precisa e sem custos de licenciamento.
