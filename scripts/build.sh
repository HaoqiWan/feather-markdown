#!/usr/bin/env sh
set -eu

VERSION="${1:-dev}"
PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DIST="$PROJECT_ROOT/dist"
mkdir -p "$DIST"
cd "$PROJECT_ROOT"

go test ./...
for TARGET in windows/amd64 windows/arm64 darwin/amd64 darwin/arm64 linux/amd64 linux/arm64; do
  GOOS=${TARGET%/*}
  GOARCH=${TARGET#*/}
  EXT=""
  [ "$GOOS" = "windows" ] && EXT=".exe"
  if [ "$GOOS" = "darwin" ]; then
    APP="$DIST/Feather Markdown-$GOARCH.app"
    mkdir -p "$APP/Contents/MacOS"
    cp "$PROJECT_ROOT/packaging/macos/Info.plist" "$APP/Contents/Info.plist"
    OUTPUT="$APP/Contents/MacOS/FeatherMarkdown"
    LABEL="Feather Markdown-$GOARCH.app"
  else
    OUTPUT="$DIST/feather-markdown-$GOOS-$GOARCH$EXT"
    LABEL=$(basename "$OUTPUT")
  fi
  LINKER_FLAGS="-s -w -buildid= -X main.version=$VERSION"
  [ "$GOOS" = "windows" ] && LINKER_FLAGS="$LINKER_FLAGS -H=windowsgui"
  CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" go build -trimpath -buildvcs=false \
    -ldflags="$LINKER_FLAGS" -o "$OUTPUT" .
  SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
  if [ "$SIZE" -gt 10485760 ]; then
    echo "$(basename "$OUTPUT") exceeds 10 MiB ($SIZE bytes)" >&2
    exit 1
  fi
  awk -v name="$LABEL" -v size="$SIZE" 'BEGIN { printf "%s: %.2f MiB\n", name, size / 1048576 }'
done
