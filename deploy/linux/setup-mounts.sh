#!/usr/bin/env bash
set -euo pipefail

MOUNT_ROOT="${PRICING_MOUNT_ROOT:-/opt/pricing}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_CSV="${SCRIPT_DIR}/../seed-data/epac_historiquee.csv"

for directory in \
  sql-dumps \
  processed \
  static \
  consolidated \
  processed-data \
  enriched \
  features \
  runtime \
  artifacts
do
  mkdir -p "${MOUNT_ROOT}/${directory}"
done

if [[ ! -f "${SEED_CSV}" ]]; then
  echo "Seed CSV not found at ${SEED_CSV}" >&2
  exit 1
fi

cp "${SEED_CSV}" "${MOUNT_ROOT}/static/epac_historiquee.csv"

echo "Pricing mount folders prepared under ${MOUNT_ROOT}"
echo "Static CSV seeded to ${MOUNT_ROOT}/static/epac_historiquee.csv"
