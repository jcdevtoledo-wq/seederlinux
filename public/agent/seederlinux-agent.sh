#!/usr/bin/env bash
# =============================================================================
# SeederLinux Agent — sincroniza perfil + scripts, registra logs e faz check-in
# -----------------------------------------------------------------------------
# Fluxo:
#   1. PULL     : GET /api/public/station-pull
#   2. SNAPSHOT : tar.gz dos paths protegidos antes do APPLY (rollback médio)
#   3. APPLY    : executa scripts em ordem; em falha, RESTAURA snapshot
#   4. RUN      : POST /api/public/station-runs (status ok | erro | rollback)
#   5. CHECKIN  : POST /api/public/station-checkin
#
# Logs / estado:
#   /var/log/seederlinux-agent.log              — log corrido (uma linha por evento)
#   /var/lib/seederlinux/runs/<timestamp>.json  — JSON estruturado por execução
#   /var/lib/seederlinux/snapshots/<ts>.tgz     — snapshot pré-apply (rollback)
#   /var/lib/seederlinux/scripts/               — scripts da última aplicação
#
# Configurável em /etc/seederlinux/agent.env:
#   SEEDER_URL, SEEDER_TOKEN
#   SEEDER_SNAPSHOT_PATHS  (default: "/etc /home/skel /usr/local/bin")
#   SEEDER_SNAPSHOT_KEEP   (default: 5 — quantos snapshots manter)
#   SEEDER_ROLLBACK        (default: 1 — 0 desabilita restauração automática)
#
# Requer: bash, curl, jq, tar.
# =============================================================================

set -euo pipefail

AGENT_VERSION="0.3.0"
CONFIG_FILE="${SEEDER_CONFIG:-/etc/seederlinux/agent.env}"
STATE_DIR="${SEEDER_STATE_DIR:-/var/lib/seederlinux}"
SERIAL_FILE="${SEEDER_SERIAL_FILE:-$STATE_DIR/serial}"
ERROR_FLAG="$STATE_DIR/last-error"
SCRIPTS_DIR="$STATE_DIR/scripts"
RUNS_DIR="$STATE_DIR/runs"
SNAP_DIR="$STATE_DIR/snapshots"
PULL_FILE="$STATE_DIR/last-pull.json"
LOG_FILE="${SEEDER_LOG_FILE:-/var/log/seederlinux-agent.log}"

mkdir -p "$STATE_DIR" "$SCRIPTS_DIR" "$RUNS_DIR" "$SNAP_DIR"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

: "${SEEDER_URL:?SEEDER_URL não definido em $CONFIG_FILE}"
: "${SEEDER_TOKEN:?SEEDER_TOKEN não definido em $CONFIG_FILE}"
: "${SEEDER_SNAPSHOT_PATHS:=/etc /home/skel /usr/local/bin}"
: "${SEEDER_SNAPSHOT_KEEP:=5}"
: "${SEEDER_ROLLBACK:=1}"

command -v jq   >/dev/null || { echo "jq não encontrado — instale (apt install jq)";   exit 2; }
command -v curl >/dev/null || { echo "curl não encontrado"; exit 2; }
command -v tar  >/dev/null || { echo "tar não encontrado"; exit 2; }

BASE="${SEEDER_URL%/}"

# Log estruturado: uma linha JSON por evento, em $LOG_FILE
log() {
  local level="$1"; shift
  local msg="$*"
  local line
  line=$(jq -nc --arg ts "$(date -Iseconds)" --arg lvl "$level" --arg msg "$msg" \
    '{ts:$ts, level:$lvl, msg:$msg}')
  echo "$line" | tee -a "$LOG_FILE" >&2
}

# ---------- Coleta básica ----------
HOSTNAME="$(hostname -s 2>/dev/null || hostname)"
IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')"
IP="${IP:-127.0.0.1}"
if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  DISTRO="${ID:-unknown}"
else
  DISTRO="unknown"
fi
DESKTOP="${XDG_CURRENT_DESKTOP:-${DESKTOP_SESSION:-headless}}"
USUARIO="$(who | awk 'NR==1{print $1}')"
USUARIO="${USUARIO:-root}"

SERIAL_LOCAL="0"
[[ -r "$SERIAL_FILE" ]] && SERIAL_LOCAL="$(tr -d '[:space:]' <"$SERIAL_FILE")"
[[ "$SERIAL_LOCAL" =~ ^[0-9]+$ ]] || SERIAL_LOCAL="0"
SERIAL_ANTERIOR="$SERIAL_LOCAL"

RUN_STARTED_AT="$(date -Iseconds)"
RUN_START_EPOCH_MS=$(($(date +%s%N) / 1000000))

# ---------- 1) PULL ----------
PULL_URL="$BASE/api/public/station-pull"
log info "pull url=$PULL_URL"
HTTP_CODE=$(curl -sS -o "$PULL_FILE" -w "%{http_code}" \
  -H "x-station-token: $SEEDER_TOKEN" \
  "$PULL_URL" || echo "000")

PROFILE_ID="null"
PROFILE_NOME="—"
SERIAL_REMOTO="$SERIAL_LOCAL"
N_SCRIPTS=0

if [[ "$HTTP_CODE" != "200" ]]; then
  log error "pull-failed http=$HTTP_CODE"
  echo "pull-failed-$HTTP_CODE" >"$ERROR_FLAG"
  STATUS="erro"
else
  rm -f "$ERROR_FLAG"
  SERIAL_REMOTO="$(jq -r '.serial // 0' "$PULL_FILE")"
  PROFILE_ID="$(jq -r '.profile.id // "null"' "$PULL_FILE")"
  PROFILE_NOME="$(jq -r '.profile.nome // "—"' "$PULL_FILE")"
  N_SCRIPTS="$(jq -r '.scripts | length' "$PULL_FILE")"
  log info "pull-ok perfil=$PROFILE_NOME scripts=$N_SCRIPTS serial_local=$SERIAL_LOCAL serial_remoto=$SERIAL_REMOTO"
  STATUS="ok"
fi

# ---------- 2) SNAPSHOT (apenas se vamos aplicar) ----------
SNAP_FILE=""
make_snapshot() {
  local existing=()
  # filtra paths que existem
  for p in $SEEDER_SNAPSHOT_PATHS; do
    [[ -e "$p" ]] && existing+=("$p")
  done
  if [[ ${#existing[@]} -eq 0 ]]; then
    log warn "snapshot-skip nenhum path em SEEDER_SNAPSHOT_PATHS existe"
    return 0
  fi
  SNAP_FILE="$SNAP_DIR/$(date -u +%Y%m%dT%H%M%SZ)-pre.tgz"
  if tar --warning=no-file-changed -czf "$SNAP_FILE" "${existing[@]}" 2>>"$LOG_FILE"; then
    log info "snapshot-ok file=$SNAP_FILE size=$(stat -c%s "$SNAP_FILE" 2>/dev/null || echo 0)"
  else
    log error "snapshot-fail file=$SNAP_FILE"
    SNAP_FILE=""
  fi
  # rotação
  ls -1t "$SNAP_DIR"/*.tgz 2>/dev/null | tail -n +$((SEEDER_SNAPSHOT_KEEP + 1)) | xargs -r rm -f
}

restore_snapshot() {
  [[ -z "$SNAP_FILE" || ! -r "$SNAP_FILE" ]] && { log error "rollback-skip sem snapshot"; return 1; }
  log warn "rollback-start file=$SNAP_FILE"
  if tar -xzf "$SNAP_FILE" -C / 2>>"$LOG_FILE"; then
    log info "rollback-ok"
    return 0
  fi
  log error "rollback-fail"
  return 1
}

# ---------- 3) APPLY ----------
SCRIPTS_OK=0
RUN_LOG="[]"
APPLIED=0
ROLLED_BACK=0

if [[ "$STATUS" == "ok" && "$SERIAL_REMOTO" -gt "$SERIAL_LOCAL" && "$N_SCRIPTS" -gt 0 ]]; then
  APPLIED=1
  log info "apply-start serial=$SERIAL_REMOTO scripts=$N_SCRIPTS"
  make_snapshot

  while IFS=$'\t' read -r KEY VAL; do
    [[ -z "$KEY" ]] && continue
    export "$KEY"="$VAL"
  done < <(jq -r '.variables | to_entries[] | "\(.key)\t\(.value)"' "$PULL_FILE")

  rm -f "$SCRIPTS_DIR"/*.sh 2>/dev/null || true
  APPLY_OK=1
  INDEX=0

  while IFS= read -r SCRIPT_JSON; do
    INDEX=$((INDEX + 1))
    SID=$(jq -r '.id'       <<<"$SCRIPT_JSON")
    SNOME=$(jq -r '.nome'   <<<"$SCRIPT_JSON")
    SCONT=$(jq -r '.conteudo' <<<"$SCRIPT_JSON")
    FILE="$SCRIPTS_DIR/$(printf '%02d' "$INDEX")-${SID}.sh"
    printf '%s\n' "$SCONT" >"$FILE"
    chmod +x "$FILE"

    OUT_FILE="$(mktemp)"
    ERR_FILE="$(mktemp)"
    SCRIPT_START_MS=$(($(date +%s%N) / 1000000))
    EXIT_CODE=0
    bash "$FILE" >"$OUT_FILE" 2>"$ERR_FILE" || EXIT_CODE=$?
    SCRIPT_END_MS=$(($(date +%s%N) / 1000000))
    DUR_MS=$((SCRIPT_END_MS - SCRIPT_START_MS))

    OUT_TAIL="$(tail -c 6000 "$OUT_FILE" 2>/dev/null || true)"
    ERR_TAIL="$(tail -c 6000 "$ERR_FILE" 2>/dev/null || true)"
    rm -f "$OUT_FILE" "$ERR_FILE"

    if [[ "$EXIT_CODE" -eq 0 ]]; then
      SCRIPTS_OK=$((SCRIPTS_OK + 1))
      log info "script-ok ordem=$INDEX id=$SID nome=$SNOME dur_ms=$DUR_MS"
    else
      log error "script-fail ordem=$INDEX id=$SID nome=$SNOME exit=$EXIT_CODE dur_ms=$DUR_MS"
    fi

    RUN_LOG=$(jq -c \
      --arg id "$SID" --arg nome "$SNOME" \
      --argjson ordem "$INDEX" --argjson exit "$EXIT_CODE" --argjson dur "$DUR_MS" \
      --arg out "$OUT_TAIL" --arg err "$ERR_TAIL" \
      '. + [{id:$id, nome:$nome, ordem:$ordem, exit_code:$exit, duracao_ms:$dur, stdout_tail:$out, stderr_tail:$err}]' \
      <<<"$RUN_LOG")

    if [[ "$EXIT_CODE" -ne 0 ]]; then
      echo "script-failed:$SID" >"$ERROR_FLAG"
      APPLY_OK=0
      break
    fi
  done < <(jq -c '.scripts[]' "$PULL_FILE")

  if [[ "$APPLY_OK" -eq 1 ]]; then
    echo "$SERIAL_REMOTO" >"$SERIAL_FILE"
    SERIAL_LOCAL="$SERIAL_REMOTO"
    STATUS="ok"
    log info "apply-ok serial=$SERIAL_LOCAL scripts_ok=$SCRIPTS_OK/$N_SCRIPTS"
  else
    STATUS="erro"
    log error "apply-fail scripts_ok=$SCRIPTS_OK/$N_SCRIPTS"
    if [[ "$SEEDER_ROLLBACK" == "1" ]]; then
      if restore_snapshot; then
        STATUS="rollback"
        ROLLED_BACK=1
      fi
    fi
  fi
else
  [[ "$STATUS" == "ok" ]] && log info "nada-a-aplicar"
fi

[[ -f "$ERROR_FLAG" && "$ROLLED_BACK" -eq 0 ]] && STATUS="erro"

RUN_FINISHED_AT="$(date -Iseconds)"
RUN_DUR_MS=$(( $(date +%s%N) / 1000000 - RUN_START_EPOCH_MS ))

# ---------- 4) RUN (relatório estruturado) ----------
if [[ "$APPLIED" -eq 1 ]]; then
  RUN_PAYLOAD=$(jq -nc \
    --arg profile "$PROFILE_ID" \
    --argjson serial_alvo "$SERIAL_REMOTO" \
    --argjson serial_anterior "$SERIAL_ANTERIOR" \
    --arg status "$STATUS" \
    --argjson total "$N_SCRIPTS" \
    --argjson ok "$SCRIPTS_OK" \
    --argjson dur "$RUN_DUR_MS" \
    --arg agent "$AGENT_VERSION" \
    --arg started "$RUN_STARTED_AT" \
    --arg finished "$RUN_FINISHED_AT" \
    --argjson log "$RUN_LOG" \
    --arg snap "$SNAP_FILE" \
    --argjson rb "$ROLLED_BACK" \
    '{
      profile_id: (if $profile == "null" then null else $profile end),
      serial_alvo: $serial_alvo,
      serial_anterior: $serial_anterior,
      status: $status,
      scripts_total: $total,
      scripts_ok: $ok,
      duracao_ms: $dur,
      agent_version: $agent,
      started_at: $started,
      finished_at: $finished,
      log: $log,
      snapshot_file: (if $snap == "" then null else $snap end),
      rolled_back: ($rb == 1)
    }')

  RUN_LOCAL="$RUNS_DIR/$(date -u +%Y%m%dT%H%M%SZ).json"
  echo "$RUN_PAYLOAD" >"$RUN_LOCAL"
  log info "run-saved file=$RUN_LOCAL"

  RUNS_URL="$BASE/api/public/station-runs"
  RC=$(curl -sS -o /tmp/seederlinux-run-resp.json -w "%{http_code}" \
    -X POST "$RUNS_URL" \
    -H "content-type: application/json" \
    -H "x-station-token: $SEEDER_TOKEN" \
    --data "$RUN_PAYLOAD" || echo "000")
  log info "run-posted http=$RC"
fi

# ---------- 5) CHECK-IN ----------
# Status reportado para o painel: ok/erro (rollback é tratado como erro recuperado)
CHECKIN_STATUS="$STATUS"
[[ "$STATUS" == "rollback" ]] && CHECKIN_STATUS="erro"

PAYLOAD=$(jq -nc \
  --argjson serial "$SERIAL_LOCAL" \
  --arg status "$CHECKIN_STATUS" \
  --arg ip "$IP" --arg distro "$DISTRO" --arg desktop "$DESKTOP" \
  --arg hostname "$HOSTNAME" --arg usuario "$USUARIO" \
  '{serial_aplicado:$serial, status:$status, ip:$ip, distro:$distro, desktop:$desktop, hostname:$hostname, usuario:$usuario}')

CHECKIN_URL="$BASE/api/public/station-checkin"
HTTP_CODE=$(curl -sS -o /tmp/seederlinux-resp.json -w "%{http_code}" \
  -X POST "$CHECKIN_URL" \
  -H "content-type: application/json" \
  -H "x-station-token: $SEEDER_TOKEN" \
  --data "$PAYLOAD" || echo "000")
log info "checkin http=$HTTP_CODE status=$STATUS serial=$SERIAL_LOCAL rolled_back=$ROLLED_BACK"

[[ "$HTTP_CODE" == "200" ]] || exit 1
[[ "$STATUS" == "ok" || "$STATUS" == "rollback" ]] || exit 3
