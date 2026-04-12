---
name: build-mac-to-xu-app
description: Build the current CodePilot macOS app, copy the built .app bundle into /Volumes/XU/APP, and open it. Use when the user asks to "build mac版", "打包 mac 版", "拷贝到 XU/APP", "打开最新 mac build", or otherwise wants the local CodePilot Electron app packaged for macOS and launched from this repository.
---

# Build Mac To XU APP

## Overview

Use this skill inside the CodePilot repository when the goal is to produce a local macOS build and deploy the runnable `.app` bundle to `/Volumes/XU/APP`.
Prefer the bundled script for repeatability instead of reconstructing the build and copy commands by hand.

## Workflow

1. Confirm the current working directory is the CodePilot repo root and that `package.json` plus `electron-builder.yml` are present.
2. Run `scripts/build_mac_to_xu_app.sh` from this skill.
3. Keep the default destination unless the user explicitly asks for another folder or app name.
4. Report the copied app path, the generated `release/` artifacts, and whether the app was opened successfully.

## Script

- Primary entry point: `scripts/build_mac_to_xu_app.sh`
- Default behavior:
  - Check for a usable local install by verifying `node_modules/.bin/next`
  - Run `npm install` only when dependencies are missing
  - Rebuild `better-sqlite3` and `zlib-sync` for the host `arm64` Node runtime before and after packaging so the workspace does not stay polluted with `x64` native binaries
  - Clean `release/` and `.next/`
  - Run `npm run electron:build`
  - Run `CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --arm64 --config electron-builder.yml`
  - Copy `release/mac-arm64/CodePilot.app` to `/Volumes/XU/APP/CodePilot.app`
  - Open the copied app unless `--no-open` was requested
- The builder command intentionally disables automatic certificate discovery because this machine can hit ambiguous Apple Development identities; ad-hoc signing is good enough for local launch.

## Options

- `--repo-root <path>` overrides the repository root.
- `--dest-dir <path>` overrides the destination directory. The script still appends `<app-name>.app`.
- `--app-name <name>` overrides the app bundle name. Default: `CodePilot`.
- `--skip-install` avoids running `npm install`.
- `--no-open` builds and copies the app without launching it.

## Output Expectations

- Mention whether dependencies had to be installed. If they were, call out that `package-lock.json` may have changed.
- Mention the runnable app bundle path in `/Volumes/XU/APP`.
- Mention the packaged artifacts in `release/`, especially the `arm64` `.dmg` and `.zip`.
- If launch was requested, mention whether `open` succeeded.

## Notes

- This skill is intentionally project-specific. It assumes the app name is `CodePilot` and the preferred deploy folder is `/Volumes/XU/APP`.
- The current project config is arm64-only for macOS packaging, so the expected runnable bundle is `release/mac-arm64/CodePilot.app`.
