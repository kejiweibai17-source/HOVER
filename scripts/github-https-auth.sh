#!/usr/bin/env bash
# GitHub HTTPS 多帳號憑證設定（macOS Keychain）
#
# 同一 GitHub 帳號下的所有 repo（如 kejiweibai17-source/HOVER、kejiweibai17-source/Weibo）
# 只需設定一次 PAT，之後 push 會自動選對帳號，不需手動切換。
#
# 用法：
#   ./scripts/github-https-auth.sh kejiweibai17-source
#   ./scripts/github-https-auth.sh kejiweibai17-source ghp_xxxxxxxxxxxx
#   ./scripts/github-https-auth.sh bob1127 ghp_xxxxxxxxxxxx
#
# 在任意已設定該 owner remote 的專案內執行即可；也可直接指定帳號。

set -euo pipefail

ensure_git_config() {
  # 避免 gh / Cursor askpass 覆蓋 Keychain 多帳號設定
  git config --global --unset-all credential.https://github.com.helper 2>/dev/null || true
  git config --global --unset-all credential.https://gist.github.com.helper 2>/dev/null || true
  git config --global credential.helper osxkeychain
  git config --global credential.useHttpPath false
  git config --global url."https://gh-keji@github.com/kejiweibai17-source/".insteadOf \
    "https://github.com/kejiweibai17-source/" 2>/dev/null || \
    git config --global url."https://gh-keji@github.com/kejiweibai17-source/".insteadOf \
      "https://github.com/kejiweibai17-source/"
  git config --global url."https://gh-bob@github.com/bob1127/".insteadOf \
    "https://github.com/bob1127/" 2>/dev/null || \
    git config --global url."https://gh-bob@github.com/bob1127/".insteadOf \
      "https://github.com/bob1127/"
}

ensure_git_config

KNOWN_ACCOUNTS=(
  "kejiweibai17-source:gh-keji"
  "bob1127:gh-bob"
)

usage() {
  echo "用法: $0 <github-username> [pat-token]" >&2
  echo "範例: $0 kejiweibai17-source" >&2
  echo "      $0 bob1127 ghp_xxxx" >&2
  exit 1
}

resolve_account() {
  local input="${1:-}"
  if [[ -n "${input}" ]]; then
    echo "${input}"
    return
  fi
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local remote url owner
    remote="$(git remote get-url origin 2>/dev/null || true)"
    if [[ "${remote}" =~ github\.com[:/]([^/]+)/ ]]; then
      echo "${BASH_REMATCH[1]}"
      return
    fi
  fi
  usage
}

resolve_cred_username() {
  local account="$1"
  for pair in "${KNOWN_ACCOUNTS[@]}"; do
    local owner="${pair%%:*}"
    local cred_user="${pair##*:}"
    if [[ "${account}" == "${owner}" ]]; then
      echo "${cred_user}"
      return
    fi
  done
  echo "gh-${account}"
}

ACCOUNT="$(resolve_account "${1:-}")"
CRED_USER="$(resolve_cred_username "${ACCOUNT}")"
TOKEN="${2:-}"

echo "GitHub 帳號    : ${ACCOUNT}"
echo "Credential key : ${CRED_USER}@github.com"
echo "涵蓋範圍     : https://github.com/${ACCOUNT}/*"
echo ""

if [[ -z "${TOKEN}" ]]; then
  echo "請到 https://github.com/settings/tokens 產生 Classic PAT（勾選 repo）"
  read -r -s -p "Personal Access Token（PAT，輸入時不顯示）: " TOKEN
  echo ""
fi

if [[ -z "${TOKEN}" ]]; then
  echo "Token 不可為空。" >&2
  exit 1
fi

# 清除舊憑證（真實帳號名與 credential key 都清）
for u in "${ACCOUNT}" "${CRED_USER}"; do
  printf 'protocol=https\nhost=github.com\nusername=%s\n\n' "${u}" \
    | git credential reject 2>/dev/null || true
done

# 寫入 Keychain（同一帳號所有 repo 共用）
printf 'protocol=https\nhost=github.com\nusername=%s\npassword=%s\n\n' \
  "${CRED_USER}" "${TOKEN}" | git credential approve

echo ""
echo "已儲存 ${ACCOUNT} 的 HTTPS 憑證。"
echo "以下 repo 將自動使用此帳號，無需再切換："
echo "  https://github.com/${ACCOUNT}/HOVER.git"
echo "  https://github.com/${ACCOUNT}/Weibo.git"
echo "  https://github.com/${ACCOUNT}/<其他專案>.git"
echo ""

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "測試目前專案連線..."
  if GIT_ASKPASS= SSH_ASKPASS= git ls-remote origin HEAD >/dev/null 2>&1; then
    echo "連線成功。請執行："
    echo "  GIT_ASKPASS= SSH_ASKPASS= git push -u origin main"
  else
    echo "連線失敗，請確認：" >&2
    echo "  1. PAT 是否由 ${ACCOUNT} 帳號產生，且已勾選 repo 權限" >&2
    echo "  2. Token 是否已過期或被撤銷" >&2
    exit 1
  fi
fi
