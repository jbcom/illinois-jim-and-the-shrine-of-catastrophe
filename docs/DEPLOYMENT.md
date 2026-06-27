---
title: Deployment
updated: 2026-06-27
status: current
domain: ops
---

# Deployment

Two production targets: GitHub Pages (web, primary) and Android APK (Capacitor).

---

## Environments

| Environment | URL / artifact | Trigger |
|---|---|---|
| GitHub Pages | `https://jonbogaty.com/illinois-jim-and-the-shrine-of-catastrophe/` | Push to `main` |
| Android APK | Attached to GitHub release | release-please release created |
| Local dev | `http://localhost:5173` | `pnpm dev` |

---

## GitHub Pages (cd.yml)

**Workflow:** `.github/workflows/cd.yml`
**Trigger:** push to `main` or `workflow_dispatch`.

### Steps

1. Checkout, install pnpm, setup Node 22 (with pnpm cache).
2. `actions/configure-pages` — reads Pages settings from the repository.
3. `pnpm install --frozen-lockfile`.
4. `pnpm build` with `PAGES_BASE=/illinois-jim-and-the-shrine-of-catastrophe/`
   set as an environment variable. Vite reads this variable for the `base` field
   so all asset paths are relative to the sub-path.
5. `actions/upload-pages-artifact` — packages `dist/`.
6. `actions/deploy-pages` — deploys the artifact to Pages.

Deployment concurrency is `group: pages` with `cancel-in-progress: false` so an
in-progress deployment always completes before the next one starts.

**Required permissions:** `pages: write`, `id-token: write`.

### PAGES_BASE and local dev

The `PAGES_BASE` env var only applies in the cd.yml build step. For local dev
(`pnpm dev`) and Capacitor builds, the variable is unset and Vite defaults to
`base: "/"`.

---

## Android APK (release.yml)

**Workflow:** `.github/workflows/release.yml`
**Trigger:** push to `main`; APK build runs only when release-please creates a release.

### Release-please flow

1. On every push to `main`, release-please analyses conventional-commit messages
   and opens (or updates) a release PR titled e.g. `chore(main): release 1.2.0`.
2. When the release PR is merged, release-please creates a GitHub release and
   sets `release_created: true`.
3. The `build-artifacts` job runs conditionally on `release_created == 'true'`.

### APK build steps

1. Checkout, install pnpm, setup Node 22.
2. Setup Java 21 (Temurin) — required by Gradle.
3. `pnpm install --frozen-lockfile`.
4. `pnpm build` — produces `dist/` without `PAGES_BASE` (uses `/` base for the
   WebView).
5. `pnpm cap:add:android` — scaffolds the `android/` directory (idempotent in CI
   since `android/` is not committed).
6. `pnpm cap:sync` — copies `dist/` into the Android project's assets.
7. `cd android && ./gradlew assembleDebug --no-daemon` — produces the debug APK.
8. `actions/attest-build-provenance` — attaches SLSA build provenance to the APK
   artifact.
9. `gh release upload <tag> <apk-path> --clobber` — attaches the APK to the
   GitHub release.

**Required permissions:** `contents: write`, `id-token: write`, `attestations: write`.

### release-please configuration

`release-please-config.json`:
- Release type: `node` (reads/writes `package.json` version).
- Changelog path: `CHANGELOG.md`.
- `bump-minor-pre-major: true` — minor bumps while version < 1.0.
- Conventional commit sections: feat → Features, fix → Bug Fixes, perf →
  Performance, refactor → Refactors. Build/CI/chore/test sections are hidden.

Do not manually set version numbers in `package.json` or commit messages —
release-please manages this.

---

## Running on an Android device locally

Requires Android Studio (for the emulator or USB debugging) and the Android SDK.

```bash
# One-time setup
pnpm cap:add:android          # scaffold android/ if not present

# Build + sync + launch
pnpm build
pnpm cap:sync                 # copy dist/ into android/
pnpm cap:run:android          # build APK and deploy to connected device/emulator
```

To open in Android Studio for manual inspection or release signing:
```bash
pnpm cap:open:android
```

---

## CI gate before deploy

The `cd.yml` and `release.yml` workflows do not run CI checks themselves — they
trust that the push to `main` was gated by a passing `ci.yml` run (which runs on
PRs). Only squash-merged PRs that passed CI should reach `main`.
