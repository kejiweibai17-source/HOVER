#!/usr/bin/env bash
# 繞過 Cursor / VS Code 內建 askpass，使用 Keychain 已儲存的 GitHub 憑證 push
set -euo pipefail

unset GIT_ASKPASS
unset SSH_ASKPASS

exec git push "$@"
