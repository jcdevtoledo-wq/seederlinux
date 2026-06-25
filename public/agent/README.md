# SeederLinux Agent

Agente em bash que sincroniza perfil + scripts da OM e faz check-in periódico
das estações Linux no painel SeederLinux.

## Fluxo a cada execução

1. **Pull** — `GET /api/public/station-pull` traz perfil ativo, scripts
   publicados (na ordem do perfil, **filtrados pela distro da estação**) e
   variáveis da OM.
2. **Apply** — se o `serial` remoto for maior que o local
   (`/var/lib/seederlinux/serial`), os scripts são executados em ordem com as
   variáveis da OM exportadas no ambiente. Cada script tem duração, exit code
   e tail de stdout/stderr capturados em JSON.
3. **Run report** — `POST /api/public/station-runs` envia o relatório
   estruturado para o painel (visível em **Estações → 🕘 Histórico**).
4. **Check-in** — `POST /api/public/station-checkin` reporta hostname, IP,
   distro, DE, usuário, status (`ok`/`erro`) e serial aplicado.

## Distros suportadas pelo installer

`ubuntu`, `debian`, `linuxmint`, `zorin`, `rocky`, `almalinux`, `rhel`,
`centos`, `fedora`. Outras distros podem usar o agente, basta instalar
`bash`, `curl`, `jq` e `iproute2` manualmente.

## Instalação rápida (one-liner)

No painel: **Estações → 🔑** e gere o token (mostrado uma única vez).

```bash
curl -fsSL https://<HOST>/agent/install.sh | sudo bash -s -- \
  --url https://<HOST> \
  --token <TOKEN_DA_ESTACAO>
```

O instalador:
- detecta a distro e instala `curl`, `jq` e `iproute2` (apt/dnf/yum)
- baixa `/usr/local/bin/seederlinux-agent.sh`
- escreve `/etc/seederlinux/agent.env` (chmod 600)
- cria e habilita `seederlinux-agent.timer` (a cada 15 min)
- executa a primeira sincronização

Intervalo customizado: `--interval 5` (em minutos).

## Instalação manual

```bash
sudo apt install -y curl jq iproute2     # Debian/Ubuntu
sudo dnf install -y curl jq iproute      # Rocky/Alma/Fedora

sudo curl -fsSL https://<HOST>/agent/seederlinux-agent.sh \
  -o /usr/local/bin/seederlinux-agent.sh
sudo chmod +x /usr/local/bin/seederlinux-agent.sh

sudo install -d -m 700 /etc/seederlinux
sudo tee /etc/seederlinux/agent.env >/dev/null <<EOF
SEEDER_URL="https://<HOST>"
SEEDER_TOKEN="cole-aqui-o-token-gerado"
EOF
sudo chmod 600 /etc/seederlinux/agent.env

sudo /usr/local/bin/seederlinux-agent.sh    # teste
```

## Agendamento alternativo (cron)

```bash
echo '*/15 * * * * root /usr/local/bin/seederlinux-agent.sh >> /var/log/seederlinux-agent.log 2>&1' \
  | sudo tee /etc/cron.d/seederlinux
```

## Arquivos importantes

| Caminho                              | Função                                        |
|--------------------------------------|-----------------------------------------------|
| `/etc/seederlinux/agent.env`         | URL + token (chmod 600)                       |
| `/var/lib/seederlinux/serial`        | Último serial aplicado                        |
| `/var/lib/seederlinux/scripts/`      | Scripts da última aplicação                   |
| `/var/lib/seederlinux/runs/*.json`   | Relatórios estruturados de cada execução      |
| `/var/lib/seederlinux/last-pull.json`| Última resposta do `/station-pull`            |
| `/var/lib/seederlinux/last-error`    | Existe = último status reportado virou `erro` |
| `/var/log/seederlinux-agent.log`     | Log estruturado (uma linha JSON por evento)   |

## Logs

```bash
sudo journalctl -u seederlinux-agent.service -e
sudo tail -f /var/log/seederlinux-agent.log | jq .
```
