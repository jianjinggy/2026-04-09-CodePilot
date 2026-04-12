#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: build_mac_to_xu_app.sh [options]

Options:
  --repo-root <path>   Repository root. Default: current directory
  --dest-dir <path>    Destination directory for the copied app. Default: /Volumes/XU/APP
  --app-name <name>    App bundle name without .app. Default: CodePilot
  --skip-install       Skip npm install even if node_modules/.bin/next is missing
  --no-open            Do not open the copied app after deployment
  -h, --help           Show this help message
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

restore_host_native_modules() {
  echo "[build-mac-to-xu-app] Restoring host-native better-sqlite3 and zlib-sync"
  (
    cd "$repo_root"
    npm rebuild better-sqlite3 zlib-sync
  )
}

repo_root="$(pwd)"
dest_dir="/Volumes/XU/APP"
app_name="CodePilot"
skip_install=0
should_open=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-root)
      repo_root="$2"
      shift 2
      ;;
    --dest-dir)
      dest_dir="$2"
      shift 2
      ;;
    --app-name)
      app_name="$2"
      shift 2
      ;;
    --skip-install)
      skip_install=1
      shift
      ;;
    --no-open)
      should_open=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script must run on macOS." >&2
  exit 1
fi

require_cmd npm
require_cmd npx
require_cmd ditto
if [[ $should_open -eq 1 ]]; then
  require_cmd open
fi

repo_root="$(cd "$repo_root" && pwd)"
dest_dir="$(mkdir -p "$dest_dir" && cd "$dest_dir" && pwd)"
source_app="$repo_root/release/mac-arm64/${app_name}.app"
dest_app="$dest_dir/${app_name}.app"

if [[ ! -f "$repo_root/package.json" ]]; then
  echo "package.json not found in repo root: $repo_root" >&2
  exit 1
fi

if [[ ! -f "$repo_root/electron-builder.yml" ]]; then
  echo "electron-builder.yml not found in repo root: $repo_root" >&2
  exit 1
fi

trap restore_host_native_modules EXIT

did_install=0
if [[ $skip_install -eq 0 && ! -x "$repo_root/node_modules/.bin/next" ]]; then
  echo "[build-mac-to-xu-app] Installing dependencies with npm install"
  (
    cd "$repo_root"
    npm install
  )
  did_install=1
fi

restore_host_native_modules

echo "[build-mac-to-xu-app] Cleaning previous build output"
(
  cd "$repo_root"
  rm -rf release .next
)

echo "[build-mac-to-xu-app] Running electron build"
(
  cd "$repo_root"
  npm run electron:build
)

echo "[build-mac-to-xu-app] Packaging macOS app with ad-hoc signing"
(
  cd "$repo_root"
  CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --arm64 --config electron-builder.yml
)

if [[ ! -d "$source_app" ]]; then
  echo "Expected app bundle was not created: $source_app" >&2
  exit 1
fi

echo "[build-mac-to-xu-app] Copying app to $dest_app"
ditto "$source_app" "$dest_app"

if [[ $should_open -eq 1 ]]; then
  echo "[build-mac-to-xu-app] Opening $dest_app"
  open "$dest_app"
fi

echo
echo "Build summary"
echo "  repo_root: $repo_root"
echo "  source_app: $source_app"
echo "  dest_app: $dest_app"
echo "  installed_dependencies: $did_install"

echo
echo "Release artifacts"
find "$repo_root/release" -maxdepth 1 \( -name "${app_name}-*.dmg" -o -name "${app_name}-*.zip" \) | sort

if [[ $should_open -eq 1 ]]; then
  echo
  echo "Running processes"
  pgrep -af "${app_name}\\.app/Contents/MacOS/${app_name}" || true
fi

if [[ $did_install -eq 1 ]]; then
  echo
  echo "NOTE: npm install was used, so package-lock.json may have changed."
fi
