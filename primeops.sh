#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="primeops"
APP_TITLE="PrimeOps"
REPO_URL="${PRIMEOPS_REPO_URL:-https://github.com/a317634186/-.git}"
INSTALL_DIR="${PRIMEOPS_DIR:-/opt/primeops}"
SERVICE_NAME="primeops"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NGINX_DIR="/etc/nginx/conf.d"
STATE_DIR="/etc/primeops"
PORT="${PRIMEOPS_PORT:-4173}"

say() { printf '%s\n' "$*"; }
pause_menu() { read -r -p $'\n按回车返回菜单...' _; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    say "请使用 root 用户运行：sudo bash primeops.sh"
    exit 1
  fi
}

is_installed() {
  [[ -f "${SERVICE_FILE}" && -f "${INSTALL_DIR}/server.cjs" ]]
}

service_state() {
  if is_installed && systemctl is-active --quiet "${SERVICE_NAME}"; then
    say "${APP_NAME} 已安装 · 服务运行中 · 端口 ${PORT}"
    local ip
    ip="$(public_ip)"
    if [[ -n "${ip}" ]]; then
      say "面板地址: http://${ip}:${PORT}"
    fi
  elif is_installed; then
    say "${APP_NAME} 已安装 · 服务未运行"
  else
    say "${APP_NAME} 未安装"
  fi
}

valid_domain() {
  [[ "$1" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]
}

valid_port() {
  [[ "$1" =~ ^[0-9]+$ ]] && (( "$1" >= 1 && "$1" <= 65535 ))
}

install_packages() {
  local missing=()
  command_exists git || missing+=(git)
  command_exists nginx || missing+=(nginx)
  command_exists ufw || missing+=(ufw)

  if ! command_exists node; then
    missing+=(nodejs npm)
  else
    local major
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || printf '0')"
    (( major >= 18 )) || missing+=(nodejs npm)
  fi

  if ((${#missing[@]} == 0)); then return; fi
  if ! command_exists apt-get; then
    say "当前系统不是 Debian/Ubuntu，缺少依赖：${missing[*]}"
    say "请先安装 Node.js 18+、Git、Nginx 和 UFW 后重新运行。"
    return 1
  fi
  say "· 正在安装依赖：${missing[*]}"
  apt-get update
  apt-get install -y "${missing[@]}"
  if ! command_exists node || (( "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || printf '0')" < 18 )); then
    say 'Node.js 18+ 未就绪，请手动安装 Node.js 18 或更高版本后重试。'
    return 1
  fi
}

node_path() {
  command -v node
}

create_service_user() {
  if ! id -u "${APP_NAME}" >/dev/null 2>&1; then
    useradd --system --home-dir "${INSTALL_DIR}" --shell /usr/sbin/nologin "${APP_NAME}"
  fi
  chown -R "${APP_NAME}:${APP_NAME}" "${INSTALL_DIR}"
}

generate_token() {
  if command_exists openssl; then
    openssl rand -hex 16
  else
    tr -dc 'a-f0-9' < /dev/urandom 2>/dev/null | head -c 32
  fi
}

write_service() {
  local node_bin token
  node_bin="$(node_path)"
  token="$(generate_token)"
  mkdir -p "${STATE_DIR}"
  printf '%s\n' "${token}" > "${STATE_DIR}/token"
  chmod 600 "${STATE_DIR}/token"
  cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=${APP_TITLE} Linux operations console
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_NAME}
Group=${APP_NAME}
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=${PORT}
Environment=PRIMEOPS_TOKEN=${token}
ExecStart=${node_bin} ${INSTALL_DIR}/server.cjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}"
}

grant_docker_access() {
  if command_exists docker && id -u "${APP_NAME}" >/dev/null 2>&1; then
    if ! id -nG "${APP_NAME}" 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
      usermod -aG docker "${APP_NAME}"
      systemctl restart "${SERVICE_NAME}"
      say "· 已授权面板读取 Docker（加入 docker 组）"
    fi
  fi
}

clone_or_update() {
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    git -C "${INSTALL_DIR}" fetch --all --prune
    git -C "${INSTALL_DIR}" pull --ff-only
  elif [[ -e "${INSTALL_DIR}" ]]; then
    say "安装目录已存在但不是 Git 仓库：${INSTALL_DIR}"
    say "为避免覆盖现有文件，安装已停止。"
    return 1
  else
    mkdir -p "$(dirname "${INSTALL_DIR}")"
    git clone "${REPO_URL}" "${INSTALL_DIR}"
  fi
}

CACHED_IP=""
public_ip() {
  if [[ -n "${CACHED_IP}" ]]; then printf '%s' "${CACHED_IP}"; return; fi
  CACHED_IP="$(curl -fsS -m 4 -4 https://api.ipify.org 2>/dev/null || curl -fsS -m 4 -4 ifconfig.me 2>/dev/null || true)"
  printf '%s' "${CACHED_IP}"
}

allow_firewall_if_needed() {
  if command_exists ufw && ufw status 2>/dev/null | grep -qi 'status: active'; then
    ufw allow "${PORT}/tcp" >/dev/null 2>&1 || true
    say "· 已自动放行防火墙 TCP ${PORT}"
  fi
}

print_success() {
  local ip token
  ip="$(public_ip)"
  token="$(cat "${STATE_DIR}/token" 2>/dev/null || printf '未生成')"
  say ''
  say '=================================================='
  say "  ${APP_TITLE} 安装成功！"
  if [[ -n "${ip}" ]]; then
    say "  在浏览器打开: http://${ip}:${PORT}"
  else
    say "  在浏览器打开: http://你的服务器IP:${PORT}"
  fi
  say "  访问密钥（首次打开时输入）: ${token}"
  say ''
  say '  打不开？检查云服务商控制台的「安全组」，'
  say "  放行 TCP ${PORT} 端口即可。"
  say ''
  say '  忘记密钥: cat /etc/primeops/token'
  say '  以后管理这台面板，运行:'
  say "      sudo bash ${INSTALL_DIR}/primeops.sh"
  say '=================================================='
}

install_app() {
  if is_installed; then
    say "${APP_NAME} 已安装，无需重复安装。"
    say "再次管理请运行: sudo bash ${INSTALL_DIR}/primeops.sh"
    return
  fi
  install_packages
  clone_or_update
  create_service_user
  write_service
  grant_docker_access
  allow_firewall_if_needed
  print_success
}

update_app() {
  if ! is_installed; then
    say "${APP_NAME} 尚未安装，开始安装。"
    install_app
    return
  fi
  install_packages
  git -C "${INSTALL_DIR}" fetch --all --prune
  git -C "${INSTALL_DIR}" pull --ff-only
  create_service_user
  grant_docker_access
  systemctl restart "${SERVICE_NAME}"
  say "更新完成：$(git -C "${INSTALL_DIR}" rev-parse --short HEAD)"
}

nginx_config_path() {
  local domain="$1"
  printf '%s/%s-%s.conf' "${NGINX_DIR}" "${APP_NAME}" "${domain//[^A-Za-z0-9.-]/}"
}

add_domain() {
  local domain upstream config
  read -r -p '请输入域名：' domain
  if ! valid_domain "${domain}"; then say '域名格式不正确。'; return; fi
  read -r -p "应用端口 [${PORT}]：" upstream
  upstream="${upstream:-${PORT}}"
  if ! valid_port "${upstream}"; then say '端口格式不正确。'; return; fi
  if ! command_exists nginx; then say 'Nginx 未安装，请先选择 1 安装 PrimeOps。'; return; fi

  config="$(nginx_config_path "${domain}")"
  cat > "${config}" <<EOF
server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:${upstream};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  if nginx -t; then
    systemctl reload nginx
    say "域名访问已添加：http://${domain}"
    say 'HTTPS 证书可继续使用 certbot 或服务器现有证书配置。'
  else
    rm -f -- "${config}"
    say 'Nginx 配置校验失败，未应用修改。'
  fi
}

delete_domain() {
  local domain config
  read -r -p '请输入要删除的域名：' domain
  if ! valid_domain "${domain}"; then say '域名格式不正确。'; return; fi
  config="$(nginx_config_path "${domain}")"
  if [[ ! -f "${config}" ]]; then say "未找到域名配置：${domain}"; return; fi
  read -r -p "确认删除 ${domain} 的访问配置？[y/N] " answer
  [[ "${answer}" =~ ^[Yy]$ ]] || { say '已取消。'; return; }
  rm -f -- "${config}"
  if nginx -t; then systemctl reload nginx; say "域名访问已删除：${domain}"; else say 'Nginx 配置校验失败，请检查现有配置。'; fi
}

add_https() {
  local domain
  read -r -p '请输入域名：' domain
  if ! valid_domain "${domain}"; then say '域名格式不正确。'; return; fi
  if ! command_exists certbot; then
    say 'certbot 未安装，正在安装…'
    apt-get update && apt-get install -y certbot python3-certbot-nginx || { say 'certbot 安装失败，请手动安装后重试。'; return; }
  fi
  if [[ ! -f "$(nginx_config_path "${domain}")" ]]; then
    say "未找到 ${domain} 的 Nginx 配置，请先添加域名访问。"
    return
  fi
  certbot --nginx -d "${domain}"
  say "HTTPS 证书配置完成：https://${domain}"
}

allow_port() {
  local port
  read -r -p "请输入允许访问的端口 [${PORT}]：" port
  port="${port:-${PORT}}"
  valid_port "${port}" || { say '端口格式不正确。'; return; }
  ufw allow "${port}/tcp"
  say "已允许公网访问 TCP ${port}。"
}

block_port() {
  local port
  read -r -p "请输入要阻止的端口 [${PORT}]：" port
  port="${port:-${PORT}}"
  valid_port "${port}" || { say '端口格式不正确。'; return; }
  ufw deny "${port}/tcp"
  say "已阻止公网访问 TCP ${port}。"
}

view_status() {
  if ! is_installed; then
    say "${APP_NAME} 未安装。"
    return
  fi
  say "服务状态："
  systemctl status "${SERVICE_NAME}" --no-pager -l
  say
  say "最近日志（最后 20 行）："
  journalctl -u "${SERVICE_NAME}" -n 20 --no-pager
}

uninstall_app() {
  if ! is_installed; then say "${APP_NAME} 未安装。"; return; fi
  say "将停止服务并删除 ${INSTALL_DIR}。Nginx 域名配置不会自动删除。"
  read -r -p '确认卸载？输入 UNINSTALL 继续：' answer
  [[ "${answer}" == 'UNINSTALL' ]] || { say '已取消。'; return; }
  systemctl disable --now "${SERVICE_NAME}" || true
  rm -f -- "${SERVICE_FILE}"
  systemctl daemon-reload
  rm -rf -- "${INSTALL_DIR}"
  if id -u "${APP_NAME}" >/dev/null 2>&1; then userdel "${APP_NAME}" || true; fi
  say '卸载完成。'
}

menu() {
  while true; do
    clear
    say "${APP_NAME} · 管理菜单"
    say "首次使用？输入 1 回车即可完成安装"
    say
    service_state
    say
    say '------------------------'
    say '1. 安装              2. 更新            3. 卸载'
    say '4. 查看服务状态'
    say '------------------------'
    say '5. 添加域名访问      6. 删除域名访问'
    say '7. 申请 HTTPS 证书'
    say '------------------------'
    say '8. 允许端口访问       9. 阻止端口访问'
    say '------------------------'
    say '0. 退出'
    say '------------------------'
    read -r -p '请输入你的选择: ' choice
    case "${choice}" in
      1) install_app; pause_menu ;;
      2) update_app; pause_menu ;;
      3) uninstall_app; pause_menu ;;
      4) view_status; pause_menu ;;
      5) add_domain; pause_menu ;;
      6) delete_domain; pause_menu ;;
      7) add_https; pause_menu ;;
      8) allow_port; pause_menu ;;
      9) block_port; pause_menu ;;
      0) exit 0 ;;
      *) say '无效选项，请重新选择。'; sleep 1 ;;
    esac
  done
}

usage() {
  say "用法："
  say "  sudo bash primeops.sh             打开管理菜单"
  say "  sudo bash primeops.sh install     直接安装（不进菜单）"
  say "  sudo bash primeops.sh update      更新到最新版"
  say "  sudo bash primeops.sh status      查看服务状态和日志"
}

main() {
  if [[ "${1:-}" == "help" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    return
  fi
  require_root
  case "${1:-menu}" in
    install|-i|--install)
      install_app </dev/null
      ;;
    update|-u|--update)
      update_app </dev/null
      ;;
    status|-s|--status)
      view_status </dev/null
      ;;
    menu)
      # curl ... | sudo bash 时没有交互终端，直接进入一键安装
      if [[ ! -t 0 ]]; then
        install_app </dev/null
      else
        menu
      fi
      ;;
    *)
      say "未知选项：${1}"
      usage
      exit 1
      ;;
  esac
}

main "$@"
