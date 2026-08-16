# PrimeOps

PrimeOps 是一个面向 Linux 服务器管理、集群监控和 AI 运维助手的控制台面板。

## 🚀 一键安装（最简单）

**第 1 步**：登录你的 Linux 服务器（Ubuntu / Debian 系统）。

**第 2 步**：把下面这一整行复制进终端，按回车，然后等待完成：

```bash
curl -fsSL https://raw.githubusercontent.com/a317634186/-/main/primeops.sh | sudo bash
```

如果你的服务器没有 `curl`，用这个代替：

```bash
wget -qO- https://raw.githubusercontent.com/a317634186/-/main/primeops.sh | sudo bash
```

**第 3 步**：看到「安装成功」后，在浏览器打开脚本最后显示的地址（形如 `http://你的服务器IP:4173`）就能用了。

> 脚本会自动完成：安装 Node.js / Nginx / UFW → 下载 PrimeOps → 创建开机自启服务 → 放行防火墙端口。全程无需任何操作。

### 打不开怎么办？

- **云服务器**（阿里云 / 腾讯云 / AWS 等）：去控制台找「安全组」，放行 TCP **4173** 端口。
- 还是打不开：在服务器上运行 `sudo bash /opt/primeops/primeops.sh` 选 `4` 查看服务状态和日志。

## 🔧 日常管理

在服务器上运行以下命令打开管理菜单（安装、更新、卸载、域名、HTTPS、防火墙都在里面）：

```bash
sudo bash /opt/primeops/primeops.sh
```

也可以直接用参数，不进菜单：

```bash
sudo bash /opt/primeops/primeops.sh install   # 安装
sudo bash /opt/primeops/primeops.sh update    # 更新
sudo bash /opt/primeops/primeops.sh status    # 查看状态和日志
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

| 模块 | 说明 |
|------|------|
| 主机总览 | 实时查看所有节点的运行状态、资源使用与最新事件 |
| 集群监控 | 节点连接状态、出站上报策略与地区分布 |
| AI 运维助手 | 支持多 Provider（DeepSeek / 智谱 GLM / 通义千问 / Kimi 等），只读诊断，写操作逐次确认 |
| 系统管理 | 主机名、SSH 防御、BBR、Swap、内核、软件源管理 |
| 网站管理 | Nginx 站点发现、证书监控、LDNMP 环境健康 |
| Docker 管理 | 容器、镜像、网络、卷的统一管理与日志查看 |
| 应用市场 | 已审计应用目录，支持安装、更新与回滚 |
| 服务器体检 | IP / 网络线路 / 硬件性能综合测评 |
| 审计与恢复 | 变更记录、配置版本冲突检测、回滚机制 |
| 账户安全 | TOTP 两步验证、恢复码、登录限速、会话管理 |

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

页面中的主机状态、AI 工具结果和任务队列为演示数据。真实 Linux 主机控制、Provider API 调用、Agent 通信和加密密钥存储需要接入后端服务。

## 技术栈

- 纯前端：HTML / CSS / JavaScript（无框架依赖）
- 图标：[Lucide](https://lucide.dev/)
- 字体：DM Mono / Manrope / Noto Sans SC
- 后端：Node.js 原生 `http` 模块（零依赖）

## License

MIT
