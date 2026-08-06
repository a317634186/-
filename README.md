# PrimeOps

PrimeOps 是一个面向 Linux 服务器管理、集群监控和 AI 运维助手的前端原型。

## 本地运行

需要 Node.js 18 或更高版本：

```bash
node server.cjs
```

打开 `http://127.0.0.1:4173/`。

## 部署

这是一个无需构建步骤的 Node 静态服务。部署到支持 Node.js 的平台时：

- Build command：留空
- Start command：`node server.cjs`
- Port：使用平台提供的 `PORT` 环境变量，未设置时默认 `4173`

当前页面中的主机状态、AI 工具结果和任务队列是演示数据。真实 Linux 主机控制、Provider API 调用、Agent 通信和加密密钥存储需要接入后端服务后才会执行真实操作。
