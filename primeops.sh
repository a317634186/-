#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="primeops"
APP_TITLE="PrimeOps"
REPO_URL="${PRIMEOPS_REPO_URL:-https://github.com/aa317634186/-PrimeOps.git}"
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
  say "正在安装依赖：${missing[*]}"
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

write_service() {
  local node_bin
  node_bin="$(node_path)"
  mkdir -p "${STATE_DIR}"
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

install_app() {
  if is_installed; then
    say "${APP_NAME} 已安装，请选择更新或卸载。"
    return
  fi
  install_packages
  clone_or_update
  create_service_user
  write_service
  say "安装完成：${APP_TITLE} 已启动，访问 http://服务器IP:${PORT}"
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
    say "${APP_NAME}"
    say 'PrimeOps 是一款面向 Linux 服务器的基础设施管理面板'
    say "项目地址: ${REPO_URL}"
    say
    service_state
    say
    say '------------------------'
    say '1. 安装              2. 更新            3. 卸载'
    say '------------------------'
    say '5. 添加域名访问      6. 删除域名访问'
    say '7. 允许IP+端口访问   8. 阻止IP+端口访问'
    say '------------------------'
    say '0. 返回上一级选单'
    say '------------------------'
    read -r -p '请输入你的选择: ' choice
    case "${choice}" in
      1) install_app; pause_menu ;;
      2) update_app; pause_menu ;;
      3) uninstall_app; pause_menu ;;
      5) add_domain; pause_menu ;;
      6) delete_domain; pause_menu ;;
      7) allow_port; pause_menu ;;
      8) block_port; pause_menu ;;
      0) exit 0 ;;
      *) say '无效选项，请重新选择。'; sleep 1 ;;
    esac
  done
}

require_root
menu
