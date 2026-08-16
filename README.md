# PrimeOps

PrimeOps 是一个面向 Linux 服务器管理、集群监控和 AI 运维助手的控制台面板。

## 🚀 安装（最简单）

**第 1 步**：登录你的 Linux 服务器（Ubuntu / Debian 系统）。

**第 2 步**：把下面这一整行复制进终端，按回车：

```bash
curl -fsSL https://raw.githubusercontent.com/a317634186/-/main/primeops.sh -o primeops.sh && sudo bash primeops.sh
```

如果没有 `curl`，用这个代替：

```bash
wget -qO primeops.sh https://raw.githubusercontent.com/a317634186/-/main/primeops.sh && sudo bash primeops.sh
```

**第 3 步**：会出现中文管理菜单，输入 `1` 回车就开始安装：

```
primeops · 管理菜单
首次使用？输入 1 回车即可完成安装

primeops 未安装

------------------------
1. 安装              2. 更新            3. 卸载
4. 查看服务状态
------------------------
5. 添加域名访问      6. 删除域名访问
7. 申请 HTTPS 证书
------------------------
8. 允许端口访问       9. 阻止端口访问
------------------------
0. 退出
------------------------
请输入你的选择:
```

安装完成后菜单顶部会直接显示**面板地址**（形如 `http://1.2.3.4:4173`），复制到浏览器打开即可。

> 以后想再次打开这个菜单，在服务器上运行：`sudo bash /opt/primeops/primeops.sh`

### 不想选菜单？全自动一键安装

如果不想看菜单，直接静默安装，用这个命令：

```bash
curl -fsSL https://raw.githubusercontent.com/a317634186/-/main/primeops.sh | sudo bash
```

### 打不开怎么办？

- **云服务器**（阿里云 / 腾讯云 / AWS 等）：去控制台找「安全组」，放行 TCP **4173** 端口。
- 还是打不开：在服务器上运行 `sudo bash /opt/primeops/primeops.sh` 选 `4` 查看服务状态和日志。

## 🔧 日常管理

安装完成后，服务器上**直接输入 `primeops`**（或 `PrimeOps`）即可打开管理菜单，不用记任何长命令：

```bash
primeops          # 打开管理菜单（安装 / 更新 / 卸载 / 域名 / HTTPS / 防火墙）
primeops update   # 直接更新，不进菜单
primeops status   # 查看服务状态和日志
```

> 刚安装完需要重新登录 SSH（或运行 `source /etc/profile.d/primeops.sh`）快捷命令才会生效。

也可以用完整路径打开菜单：

```bash
sudo bash /opt/primeops/primeops.sh
```

服务本身的常用命令：

```bash
sudo systemctl status primeops     # 查看运行状态
sudo systemctl restart primeops    # 重启
sudo systemctl stop primeops       # 停止
```

## 🖥️ 本地开发运行

需要 Node.js 18 或更高版本：

```bash
git clone https://github.com/a317634186/-.git
cd -
node server.cjs
```

打开 `http://127.0.0.1:4173/`。

## ☁️ 平台部署

这是一个无需构建步骤的 Node 静态服务。部署到支持 Node.js 的平台时：

- **Build command**：留空
- **Start command**：`node server.cjs`
- **Port**：使用平台提供的 `PORT` 环境变量，未设置时默认 `4173`
- **环境变量**：设置 `NODE_ENV=production` 启用静态资源缓存与 Brotli/Gzip 压缩

## 功能概览

| 模块 | 数据来源 | 说明 |
|------|----------|------|
| 主机总览 | ✅ 真实 | 本机 CPU / 内存 / 磁盘实时读取，趋势图每 30 秒采样 |
| Docker 管理 | ✅ 真实 | 列出所有容器与镜像（docker ps -a / docker images），支持启动/停止/重启/查看日志 |
| 应用市场 | ✅ 真实 | 14 个精选应用 + Docker Hub 全网实时搜索，一键拉取镜像 |
| 系统管理 | ✅ 真实 | 主机名 / 内核 / 运行时间 / CPU / 内存 / 磁盘 / IP 真实读取 |
| AI 运维助手 | 演示 | Provider 配置界面已就绪，AI 调用需接入后端 |
| 集群监控 / 网站管理 / 体检 / 审计 / 账户安全 | 演示 | 多主机与写操作类功能需接入 Agent 后端 |

## 面板访问密钥

通过安装脚本部署时，会自动生成一个访问密钥（API Token）保护真实数据接口：

- 安装完成时会在屏幕上显示，形如 `a1b2c3d4...`
- 首次打开面板输入一次，浏览器会记住
- 忘记了在服务器上运行：`cat /etc/primeops/token`
- 本地开发不设置 `PRIMEOPS_TOKEN` 环境变量则不启用

## Docker 功能说明

面板通过服务器上的 Docker CLI 读取真实数据：

- 服务器已装 Docker：安装脚本自动把面板用户加入 docker 组，开箱即用
- 未装 Docker：面板会明确提示「未检测到 Docker Engine」，执行 `apt install docker.io` 后打开面板刷新即可

## 后端 API

零依赖 Node.js 原生实现，所有接口需携带 `X-PrimeOps-Token` 请求头（启用时）：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/system` | GET | 主机名 / 内核 / CPU / 内存 / 磁盘 / IP / 运行时间 |
| `/api/history` | GET | 资源趋势采样（每 30 秒，内存中保留 24 小时） |
| `/api/docker/containers` | GET | 所有容器（docker ps -a） |
| `/api/docker/images` | GET | 所有镜像（docker images） |
| `/api/docker/container/:id/start\|stop\|restart` | POST | 容器启动 / 停止 / 重启 |
| `/api/docker/logs/:id` | GET | 容器最近 200 行日志 |
| `/api/market` | GET | 精选应用目录 |
| `/api/market/search?q=` | GET | Docker Hub 实时搜索（服务端代理 + 5 分钟缓存） |
| `/api/market/pull` | POST | 真实执行 docker pull {image} |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `4173` | 服务监听端口 |
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `NODE_ENV` | - | 设为 `production` 启用缓存与压缩 |
| `PRIMEOPS_PORT` | `4173` | 安装脚本使用的端口 |
| `PRIMEOPS_DIR` | `/opt/primeops` | 安装目录 |
| `PRIMEOPS_REPO_URL` | 本仓库 | 安装脚本拉取的源地址 |

## 安全特性

- 安全响应头（X-Content-Type-Options / X-Frame-Options / Referrer-Policy / Permissions-Policy）
- 路径遍历防护（含 URL 编码变体与畸形 URI）
- 仅允许 GET / HEAD 请求
- 生产环境下自动压缩响应（Brotli 优先，回退 Gzip）
- systemd 服务以独立系统用户运行（NoNewPrivileges / PrivateTmp）

## 当前状态

主机总览、Docker 管理、应用市场、系统基础信息已接入真实数据。AI 运维助手的模型调用、多主机 Agent 通信、网站管理、服务器体检等模块仍为演示界面，需要继续接入后端能力。

## 技术栈

- 纯前端：HTML / CSS / JavaScript（无框架依赖）
- 图标：[Lucide](https://lucide.dev/)
- 字体：DM Mono / Manrope / Noto Sans SC
- 后端：Node.js 原生 `http` 模块（零依赖）

## License

MIT
