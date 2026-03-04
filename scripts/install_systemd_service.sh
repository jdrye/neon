#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="neon-game.service"
PROJECT_DIR="/opt/neon"
SOURCE_UNIT="${PROJECT_DIR}/systemd/${SERVICE_NAME}"
TARGET_UNIT="/etc/systemd/system/${SERVICE_NAME}"

if [[ ! -f "${SOURCE_UNIT}" ]]; then
  echo "Unit file not found: ${SOURCE_UNIT}" >&2
  exit 1
fi

install -m 0644 "${SOURCE_UNIT}" "${TARGET_UNIT}"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

echo
echo "Service installed and started: ${SERVICE_NAME}"
systemctl --no-pager --full status "${SERVICE_NAME}"
