#!/usr/bin/env bash
# 본 저장소(dongil)의 packages/shared/src 를 src/shared 로 복사한다.
# 사용: ./scripts/sync-shared.sh [dongil 저장소 경로, 기본 ../dongil]
set -euo pipefail
SRC="${1:-../dongil}/packages/shared/src"
DEST="$(cd "$(dirname "$0")/.." && pwd)/src/shared"
[ -d "$SRC" ] || { echo "shared 소스를 찾을 수 없음: $SRC" >&2; exit 1; }
rm -f "$DEST"/*.ts
cp "$SRC"/*.ts "$DEST"/
echo "synced $SRC -> $DEST"
