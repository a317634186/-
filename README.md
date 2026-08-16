# PrimeOps

PrimeOps 是一个面向 Linux 服务器管理、集群监控和 AI 运维助手的前端控制台。

## 功能概览

| 模块 | 说明 |
|------|------|
| 主机总览 | 实时查看所有节点的运行状态、资源使用与最新事件 |
| 集群监控 | 节点连接状态、出站上报策略与地区分布 |
| AI 运维助手 | 支持多 Provider（DeepSeek / 智谱 GLM / 通义千问 / Kimimi 等），只读诊断，写操作逐次确认 |
| 系统管理 | 主机名、SSH 防御、BBR、Swap、内核、软件源管理 |
| 网站管理 | Nginx 站点发现、证书监控、LDNMP 环境健康 |
| Docker 管理 | 容器、镜像、网络、卷的统一管理与日志查看 |
| 应用市场 | 已审计应用目录，支持安装、更新与回滚 |
| 服务器体检 | IP / 网络线路 / 硬件性能综合测评 |
| 审计与恢复 | 变更记录、配置版本冲突检测、回滚机制 |
| 账户安全 | TOTP 两步验证、恢复码、登录限速、会话管理 |

## 本地运行

需要 Node.js 18 或更高版本：

```bash
git clone https://github.com/aa317634186/-PrimeOps.git
cd -PrimeOps
node server.cjs
```

打开 `http://127.0.0.1:4173/`。

## 部署

这是一个无需构建步骤的 Node 静态服务。部署到支持 Node.js 的平台时：

- **Build command**：留空
- **Start command**：`node server.cjs`
- **Port**：使用平台提供的 `PORT` 环境变量，未设置时默认 `4173`
- **环境变量**：设置 `NODE_ENV=production` 启用静态资源缓存与 Brotli/Gzip 压缩

### 安全特性

- 安全响应头（X-Content-Type-Options / X-Frame-Options / Referrer-Policy / Permissions-Policy）
- 路径遍历防护（路径规范化 + 根目录校验）
- 仅允许 GET / HEAD 请求
- 生产环境下自动压缩响应（Brotli 优先，回退 Gzip）

## Linux 菜单部署

在 Linux 服务器上执行：

```bash
curl -fsSL https://raw.githubusercontent.com/aa317634186/-PrimeOps/main/primeops.sh -o primeops.sh
sudo bash primeops.sh
```

脚本提供以下功能：

| 选项 | 功能 |
|------|------|
| 1 | 安装（自动检测并安装 Node.js 18+、Git、Nginx、UFW） |
| 2 | 更新（拉取最新代码并重启服务） |
| 3 | 卸载（停止服务、删除文件与系统用户） |
| 4 | 查看服务状态与最近日志 |
| 5 | 添加域名反向代理（Nginx） |
| 6 | 删除域名反向代理 |
| 7 | 申请 HTTPS 证书（certbot + Let's Encrypt） |
| 8 | 允许端口访问（UFW） |
| 9 | 阻止端口访问（UFW） |

安装会创建 `primeops.service` systemd 服务，使用独立系统用户运行面板。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `4173` | 服务监听端口 |
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `NODE_ENV` | - | 设为 `production` 启用缓存与压缩 |

## 当前状态

页面中的主机状态、AI 工具结果和任务队列为演示数据。真实 Linux 主机控制、Provider API 调用、Agent 通信和加密密钥存储需要接入后端服务。

## 技术栈

- 纯前端：HTML / CSS / JavaScript（无框架依赖）
- 图标：[Lucide](https://lucide.dev/)
- 字体：DM Mono / Manrope / Noto Sans SC
- 后端：Node.js 原生 `http` 模块（零依赖）

## License

MIT
