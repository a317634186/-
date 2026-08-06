const viewPage = document.getElementById('page-content');
let aiApiMarkup = '';

function viewFrame(kicker, title, description, actions, body) {
  return `<div class="workspace-view"><section class="workspace-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span>${kicker}</div><h1>${title}</h1><p>${description}</p></div><div class="workspace-actions">${actions || ''}</div></section>${body}</div>`;
}

const viewTemplates = {
  cluster: () => viewFrame('控制平面 / 节点网络', '集群监控', '所有 KPanel 与只读节点的实时状态、连接方式与地区分布。', '<button class="button button-secondary" data-view-action="node-command"><i data-lucide="terminal"></i>节点安装命令</button><button class="button button-primary" data-view-action="open-add-host"><i data-lucide="plus"></i>接入主机</button>', `<div class="stat-strip"><div><span>在线节点</span><strong>12 <small>/ 14</small></strong><b class="good-text">+2.4%</b></div><div><span>HTTPS 通道</span><strong>09</strong><b class="good-text">安全</b></div><div><span>Noise 通道</span><strong>03</strong><b class="blue-text">已加密</b></div><div><span>待授权</span><strong>02</strong><b class="warn-text">需确认</b></div></div><div class="view-grid two-col"><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">实时节点</span><h2>主机连接状态</h2></div><button class="filter-button" data-view-action="cluster-filter"><i data-lucide="list-filter"></i>全部节点<i data-lucide="chevron-down"></i></button></div><div class="node-list"><div class="node-item"><span class="node-light online"></span><div><strong>本机 / kp-control-plane</strong><small>新加坡 · HTTPS · 103.28.14.8</small></div><span class="table-status online">运行中</span></div><div class="node-item"><span class="node-light online"></span><div><strong>sg-prod-01</strong><small>新加坡 · HTTPS · 103.75.116.21</small></div><span class="table-status online">运行中</span></div><div class="node-item"><span class="node-light warn"></span><div><strong>hk-edge-02</strong><small>中国香港 · Noise · 45.113.12.7</small></div><span class="table-status warning">需关注</span></div><div class="node-item"><span class="node-light pending"></span><div><strong>tokyo-app-02</strong><small>日本东京 · 等待一次性授权</small></div><span class="table-status pending">待授权</span></div></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">轻量节点</span><h2>出站上报策略</h2></div><span class="soft-badge">只读</span></div><div class="policy-callout"><i data-lucide="radio-tower"></i><div><strong>自动更新校验正常</strong><p>最近一次校验：2 分钟前 · 签名版本 v1.4.2</p></div></div><div class="key-value-list"><div><span>上报间隔</span><strong>30 秒</strong></div><div><span>资源占用</span><strong>&lt; 0.5% CPU</strong></div><div><span>连接出口</span><strong>HTTPS 443</strong></div><div><span>权限范围</span><strong>只读系统指标</strong></div></div><button class="button button-secondary full-button" data-view-action="node-policy"><i data-lucide="settings-2"></i>查看节点策略</button></section></div><section class="view-card map-card"><div class="view-card-head"><div><span class="panel-kicker">地区概要</span><h2>节点分布</h2></div><span class="panel-note"><span class="live-dot"></span>数据 30 秒内</span></div><div class="region-grid"><div><strong>新加坡</strong><span>5 台主机</span><b style="width:82%"></b></div><div><strong>中国香港</strong><span>3 台主机</span><b style="width:58%"></b></div><div><strong>日本东京</strong><span>2 台主机</span><b style="width:38%"></b></div><div><strong>美国西部</strong><span>2 台主机</span><b style="width:31%"></b></div></div></section>`),
  systems: () => viewFrame('主机管理 / 本机', '系统管理', '管理主机名、SSH、防御、DNS、时区、Swap、内核与系统更新。', '<button class="button button-secondary" data-view-action="system-refresh"><i data-lucide="refresh-cw"></i>刷新状态</button><button class="button button-primary" data-view-action="system-update"><i data-lucide="download"></i>检查更新</button>', `<div class="system-toolbar"><div class="host-switch"><span class="host-indicator local"></span><strong>本机 / kp-control-plane</strong><i data-lucide="chevron-down"></i></div><span class="panel-note"><span class="live-dot"></span>配置已同步</span></div><div class="view-grid two-col"><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">系统概要</span><h2>基础信息</h2></div><span class="soft-badge">Ubuntu 24.04 LTS</span></div><div class="key-value-list large"><div><span>主机名</span><strong>kp-control-plane</strong><button class="mini-button" data-view-action="confirm-write">修改</button></div><div><span>内核版本</span><strong>6.8.0-41-generic</strong><button class="mini-button" data-view-action="kernel-presets">预设</button></div><div><span>时区</span><strong>Asia/Singapore · UTC+8</strong><button class="mini-button" data-view-action="confirm-write">修改</button></div><div><span>DNS</span><strong>1.1.1.1 · 8.8.8.8</strong><button class="mini-button" data-view-action="confirm-write">修改</button></div></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">网络与性能</span><h2>运行配置</h2></div></div><div class="setting-row"><div><i data-lucide="key-round"></i><span><strong>SSH 防御</strong><small>端口 2222 · Fail2ban 运行中</small></span></div><button class="toggle on" data-view-action="confirm-write" aria-label="SSH 防御已启用"><span></span></button></div><div class="setting-row"><div><i data-lucide="gauge"></i><span><strong>BBR</strong><small>BBRv3 · TCP 拥塞控制</small></span></div><button class="toggle on" data-view-action="confirm-write" aria-label="BBR 已启用"><span></span></button></div><div class="setting-row"><div><i data-lucide="database"></i><span><strong>Swap</strong><small>4 GB · 使用率 12%</small></span></div><button class="mini-button" data-view-action="confirm-write">管理</button></div><div class="setting-row"><div><i data-lucide="package"></i><span><strong>软件源</strong><small>官方镜像 · 上次同步 3 小时前</small></span></div><button class="mini-button" data-view-action="confirm-write">配置</button></div></section></div><section class="view-card update-card"><div><span class="panel-kicker">系统维护</span><h2>更新与清理</h2><p>检测到 12 个可更新软件包，预计需要 84 MB 下载空间。</p></div><div class="update-actions"><span class="soft-badge warning-badge">需管理员确认</span><button class="button button-primary" data-view-action="confirm-write"><i data-lucide="play"></i>预览更新</button></div></section>`),
  websites: () => viewFrame('应用层 / Nginx', '网站管理', '发现现有站点、证书与 Nginx 状态，集中管理静态站、PHP 与反向代理。', '<button class="button button-secondary" data-view-action="site-scan"><i data-lucide="scan-search"></i>扫描站点</button><button class="button button-primary" data-view-action="new-site"><i data-lucide="plus"></i>创建站点</button>', `<div class="stat-strip"><div><span>活跃站点</span><strong>08</strong><b class="good-text">Nginx 正常</b></div><div><span>PHP 版本</span><strong>8.3</strong><b class="blue-text">FPM 运行中</b></div><div><span>有效证书</span><strong>07</strong><b class="good-text">自动续期</b></div><div><span>近 24h 请求</span><strong>1.2M</strong><b class="blue-text">+8.4%</b></div></div><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">站点清单</span><h2>已发现的网站</h2></div><button class="filter-button" data-view-action="site-filter"><i data-lucide="list-filter"></i>全部类型<i data-lucide="chevron-down"></i></button></div><div class="data-table site-table"><div class="data-row data-head"><span>站点</span><span>类型</span><span>证书</span><span>状态</span><span></span></div><div class="data-row"><div class="site-name"><span class="site-favicon">K</span><span><strong>panel.example.com</strong><small>/var/www/kpanel</small></span></div><span class="soft-badge">反向代理</span><span class="cert-valid"><i data-lucide="lock-keyhole"></i>有效 62 天</span><span class="table-status online">运行中</span><button class="row-menu" data-view-action="site-detail" title="站点操作"><i data-lucide="more-horizontal"></i></button></div><div class="data-row"><div class="site-name"><span class="site-favicon php">P</span><span><strong>blog.example.com</strong><small>/var/www/blog</small></span></div><span class="soft-badge purple-badge">PHP 8.3</span><span class="cert-valid"><i data-lucide="lock-keyhole"></i>有效 128 天</span><span class="table-status online">运行中</span><button class="row-menu" data-view-action="site-detail" title="站点操作"><i data-lucide="more-horizontal"></i></button></div><div class="data-row"><div class="site-name"><span class="site-favicon static">S</span><span><strong>docs.example.com</strong><small>/var/www/docs</small></span></div><span class="soft-badge green-badge">静态站</span><span class="cert-valid"><i data-lucide="triangle-alert"></i>11 天后到期</span><span class="table-status warning">需续期</span><button class="row-menu" data-view-action="site-detail" title="站点操作"><i data-lucide="more-horizontal"></i></button></div></div></section><div class="view-grid two-col compact-grid"><section class="view-card"><span class="panel-kicker">环境健康</span><h2>LDNMP</h2><div class="health-bars"><div><span>Nginx</span><b><i style="width:96%"></i></b><strong>正常</strong></div><div><span>PHP-FPM</span><b><i style="width:88%"></i></b><strong>正常</strong></div><div><span>MySQL</span><b><i style="width:73%"></i></b><strong>稳定</strong></div></div></section><section class="view-card"><span class="panel-kicker">备份策略</span><h2>最近备份</h2><div class="backup-line"><i data-lucide="database-backup"></i><span><strong>全站快照</strong><small>今天 03:00 · 1.8 GB</small></span><button class="mini-button" data-view-action="restore-site">还原</button></div></section></div>`),
  containers: () => viewFrame('运行时 / Docker Engine', 'Docker 管理', '统一查看容器、镜像、网络与卷，支持日志、采样、备份和迁移。', '<button class="button button-secondary" data-view-action="docker-refresh"><i data-lucide="refresh-cw"></i>刷新状态</button><button class="button button-primary" data-view-action="docker-compose"><i data-lucide="terminal"></i>脚本终端</button>', `<div class="stat-strip"><div><span>运行中容器</span><strong>18 <small>/ 21</small></strong><b class="good-text">稳定</b></div><div><span>镜像</span><strong>34</strong><b class="warn-text">3 可更新</b></div><div><span>网络</span><strong>07</strong><b class="blue-text">正常</b></div><div><span>卷</span><strong>29</strong><b class="blue-text">1.4 TB</b></div></div><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">容器清单</span><h2>生产环境</h2></div><div class="view-card-actions"><button class="filter-button" data-view-action="container-filter"><i data-lucide="list-filter"></i>运行中<i data-lucide="chevron-down"></i></button><button class="icon-button compact" data-view-action="docker-settings" title="Docker 设置"><i data-lucide="settings-2"></i></button></div></div><div class="data-table container-table"><div class="data-row data-head"><span>容器</span><span>镜像</span><span>资源</span><span>状态</span><span></span></div><div class="data-row"><div class="container-name"><span class="container-dot running"></span><span><strong>kp-web</strong><small>0.0.0.0:8080 → 80</small></span></div><span class="mono">nginx:1.27</span><span class="resource-pair">CPU 2.1% · MEM 83 MB</span><span class="table-status online">运行中</span><button class="row-menu" data-view-action="container-detail" title="容器操作"><i data-lucide="more-horizontal"></i></button></div><div class="data-row"><div class="container-name"><span class="container-dot running"></span><span><strong>kp-api</strong><small>0.0.0.0:9000 → 9000</small></span></div><span class="mono">kp-api:v2.8.4</span><span class="resource-pair">CPU 8.6% · MEM 312 MB</span><span class="table-status online">运行中</span><button class="row-menu" data-view-action="container-detail" title="容器操作"><i data-lucide="more-horizontal"></i></button></div><div class="data-row"><div class="container-name"><span class="container-dot update"></span><span><strong>redis-cache</strong><small>internal:6379</small></span></div><span class="mono">redis:7.4</span><span class="resource-pair">CPU 0.8% · MEM 46 MB</span><span class="table-status warning">可更新</span><button class="row-menu" data-view-action="container-detail" title="容器操作"><i data-lucide="more-horizontal"></i></button></div></div></section><div class="view-grid three-col"><section class="view-card action-tile"><i data-lucide="file-text"></i><div><strong>实时日志</strong><small>跟踪指定容器输出</small></div><button class="text-button" data-view-action="container-logs">打开<i data-lucide="arrow-up-right"></i></button></section><section class="view-card action-tile"><i data-lucide="archive-restore"></i><div><strong>备份与还原</strong><small>镜像、卷与配置快照</small></div><button class="text-button" data-view-action="container-backup">管理<i data-lucide="arrow-up-right"></i></button></section><section class="view-card action-tile"><i data-lucide="send"></i><div><strong>SSH 迁移</strong><small>迁移前自动校验兼容性</small></div><button class="text-button" data-view-action="container-migrate">开始<i data-lucide="arrow-up-right"></i></button></section></div>`),
  market: () => viewFrame('已审计 / 应用目录', '应用市场', '展示真实安装状态，为已审计应用提供安装、更新、卸载与失败回滚。', '<button class="button button-secondary" data-view-action="market-refresh"><i data-lucide="refresh-cw"></i>同步目录</button><button class="button button-primary" data-view-action="market-terminal"><i data-lucide="terminal"></i>交互终端</button>', `<div class="market-toolbar"><div class="search-field"><i data-lucide="search"></i><input placeholder="搜索应用、镜像或能力" /></div><div class="market-filters"><button class="filter-chip selected" data-view-action="market-filter">全部</button><button class="filter-chip" data-view-action="market-filter">建站</button><button class="filter-chip" data-view-action="market-filter">数据库</button><button class="filter-chip" data-view-action="market-filter">监控</button></div></div><div class="app-grid"><article class="app-card"><div class="app-card-icon blue-icon"><i data-lucide="cloud"></i></div><div class="app-card-top"><span class="verified"><i data-lucide="badge-check"></i>已审计</span><span class="soft-badge green-badge">已安装</span></div><h2>Nextcloud</h2><p>自托管文件同步与协作空间，支持外部存储。</p><div class="app-meta"><span>v30.0.2</span><span>4.8k 安装</span></div><button class="button button-secondary full-button" data-view-action="app-manage">管理应用<i data-lucide="arrow-right"></i></button></article><article class="app-card"><div class="app-card-icon orange-icon"><i data-lucide="bar-chart-3"></i></div><div class="app-card-top"><span class="verified"><i data-lucide="badge-check"></i>已审计</span><span class="soft-badge">可安装</span></div><h2>Uptime Kuma</h2><p>轻量级服务状态监控与通知中心。</p><div class="app-meta"><span>v1.23.13</span><span>12.6k 安装</span></div><button class="button button-primary full-button" data-view-action="install-app">安装应用<i data-lucide="download"></i></button></article><article class="app-card"><div class="app-card-icon green-icon"><i data-lucide="database"></i></div><div class="app-card-top"><span class="verified"><i data-lucide="badge-check"></i>已审计</span><span class="soft-badge warning-badge">有更新</span></div><h2>PostgreSQL</h2><p>生产级关系型数据库，支持备份和版本迁移。</p><div class="app-meta"><span>v16.4 → 16.5</span><span>9.1k 安装</span></div><button class="button button-secondary full-button" data-view-action="update-app">查看更新<i data-lucide="arrow-up"></i></button></article></div>`),
  checkup: () => viewFrame('诊断工具 / 只读检查', '服务器体检', '运行 IP、网络线路、硬件性能和综合测评，持续展示来源、资源影响和实时日志。', '<button class="button button-secondary" data-view-action="checkup-history"><i data-lucide="history"></i>历史结果</button><button class="button button-primary" data-view-action="start-checkup"><i data-lucide="play"></i>开始体检</button>', `<section class="checkup-hero"><div class="checkup-score"><span>综合评分</span><strong>92</strong><small>/ 100</small><b>良好</b></div><div class="checkup-copy"><span class="panel-kicker">最近一次测评 · 今天 08:24</span><h2>当前主机运行状态良好</h2><p>4 项检查已通过，1 项建议优化。脚本来源已固定，预计资源影响低于 2%。</p><div class="source-line"><i data-lucide="shield-check"></i><span>来源已校验：app.kejilion.sh / checkup-v1.8.0</span></div></div></section><div class="view-grid two-col"><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">检查流程</span><h2>实时检查项</h2></div><span class="soft-badge green-badge">已完成</span></div><div class="check-list"><div><span class="check-index done"><i data-lucide="check"></i></span><span><strong>IP 与解锁能力</strong><small>IPv4 / IPv6 / 流媒体解锁</small></span><b>通过</b></div><div><span class="check-index done"><i data-lucide="check"></i></span><span><strong>网络线路</strong><small>TCP 延迟 / 回程 / DNS</small></span><b>通过</b></div><div><span class="check-index done"><i data-lucide="check"></i></span><span><strong>硬件性能</strong><small>CPU / 内存 / 磁盘 I/O</small></span><b>通过</b></div><div><span class="check-index notice"><i data-lucide="info"></i></span><span><strong>系统优化</strong><small>BBR / Swap / 文件句柄</small></span><b class="warn-text">建议优化</b></div></div></section><section class="view-card log-card"><div class="view-card-head"><div><span class="panel-kicker">实时日志</span><h2>checkup.log</h2></div><button class="icon-button compact" data-view-action="copy-log" title="复制日志"><i data-lucide="copy"></i></button></div><pre><span>[08:24:01]</span> resolve host: kp-control-plane<br><span class="ok">[08:24:03]</span> network route: Singapore / AS9506<br><span class="ok">[08:24:08]</span> disk benchmark: 1,842 MB/s<br><span>[08:24:12]</span> kernel preset: generic / BBRv3<br><span class="warn">[08:24:14]</span> swap usage recommendation found<br><span class="ok">[08:24:16]</span> completed with score 92/100</pre></section></div><section class="view-card history-card"><div><span class="panel-kicker">资源影响</span><h2>本次体检消耗</h2></div><div class="impact-list"><span>CPU 峰值 <strong>18%</strong></span><span>内存增加 <strong>126 MB</strong></span><span>持续时间 <strong>00:02:16</strong></span><span>结果大小 <strong>42 KB</strong></span></div></section>`),
  audit: () => viewFrame('治理 / 变更记录', '审计与恢复', '记录管理变更，检测版本冲突，写入前校验并在失败时回滚。', '<button class="button button-secondary" data-view-action="audit-export"><i data-lucide="download"></i>导出记录</button><button class="button button-primary" data-view-action="audit-review"><i data-lucide="inbox"></i>审核队列 <span class="button-count">2</span></button>', `<div class="stat-strip"><div><span>今日变更</span><strong>18</strong><b class="blue-text">+4</b></div><div><span>待审核</span><strong>02</strong><b class="warn-text">需要处理</b></div><div><span>版本冲突</span><strong>01</strong><b class="warn-text">已检测</b></div><div><span>已回滚</span><strong>00</strong><b class="good-text">无失败</b></div></div><section class="view-card conflict-card"><div class="conflict-icon"><i data-lucide="triangle-alert"></i></div><div><span class="panel-kicker">需要管理员确认</span><h2>配置版本冲突 · hk-edge-02</h2><p>面板检测到本地手动修改与待写入的 SSH 防御策略冲突。当前配置未被覆盖。</p><div class="diff-line"><span>当前值</span><code>Port 22 · PasswordAuthentication yes</code><span>建议值</span><code>Port 2222 · PasswordAuthentication no</code></div></div><div class="conflict-actions"><button class="button button-secondary" data-view-action="view-diff">查看差异</button><button class="button button-primary" data-view-action="approve-conflict">审核并应用</button></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">变更记录</span><h2>最近操作</h2></div><button class="filter-button" data-view-action="audit-filter"><i data-lucide="list-filter"></i>全部操作者<i data-lucide="chevron-down"></i></button></div><div class="data-table audit-table"><div class="data-row data-head"><span>时间</span><span>操作者</span><span>变更</span><span>目标</span><span>结果</span></div><div class="data-row"><span class="mono">今天 09:12:44</span><strong>Y. Lin</strong><span>修改 SSH 防御策略</span><span class="mono">本机</span><span class="table-status online">已完成</span></div><div class="data-row"><span class="mono">今天 08:24:16</span><strong>KPanel Checkup</strong><span>运行服务器体检</span><span class="mono">本机</span><span class="table-status online">已完成</span></div><div class="data-row"><span class="mono">昨天 22:06:31</span><strong>Y. Lin</strong><span>更新容器镜像</span><span class="mono">sg-prod-01</span><span class="table-status online">已完成</span></div></div></section>`),
  security: () => viewFrame('身份与访问 / 管理员', '账户安全', '默认关闭、主动启用的 TOTP，两步验证、恢复码、登录限速与本地密钥保护。', '<button class="button button-secondary" data-view-action="security-log"><i data-lucide="file-clock"></i>安全日志</button><button class="button button-primary" data-view-action="enable-totp"><i data-lucide="shield-plus"></i>启用 TOTP</button>', `<div class="security-grid"><section class="view-card security-main"><div class="security-status"><span class="security-ring"><i data-lucide="shield-check"></i></span><div><span class="panel-kicker">账户防护</span><h2>基础安全状态良好</h2><p>密码登录、限速与本地密钥保护均已启用。</p></div><span class="soft-badge green-badge">已保护</span></div><div class="security-list"><div><i data-lucide="smartphone"></i><span><strong>TOTP 两步验证</strong><small>当前未启用 · 启用后会吊销现有 Session</small></span><button class="mini-button primary-mini" data-view-action="enable-totp">启用</button></div><div><i data-lucide="key-round"></i><span><strong>一次性恢复码</strong><small>尚未生成 · 生成后仅显示一次</small></span><button class="mini-button" data-view-action="generate-recovery">生成</button></div><div><i data-lucide="gauge"></i><span><strong>登录限速</strong><small>5 次 / 15 分钟 · 超限锁定 30 分钟</small></span><button class="toggle on" data-view-action="confirm-write" aria-label="登录限速已启用"><span></span></button></div><div><i data-lucide="lock-keyhole"></i><span><strong>本地加密密钥</strong><small>硬件安全存储 · 最近轮换 24 天前</small></span><button class="mini-button" data-view-action="rotate-key">轮换</button></div></div></section><section class="view-card session-card"><div class="view-card-head"><div><span class="panel-kicker">活动会话</span><h2>已登录设备</h2></div><button class="text-button" data-view-action="revoke-all">全部吊销</button></div><div class="session-list"><div><i data-lucide="monitor"></i><span><strong>当前浏览器 · 新加坡</strong><small>Windows · 最近活动</small></span><span class="current-session">当前</span></div><div><i data-lucide="terminal-square"></i><span><strong>CLI Token · 本机</strong><small>最后使用 2 小时前</small></span><button class="mini-button" data-view-action="revoke-session">吊销</button></div><div><i data-lucide="smartphone"></i><span><strong>移动设备 · 新加坡</strong><small>最后使用昨天 18:40</small></span><button class="mini-button" data-view-action="revoke-session">吊销</button></div></div></section></div><section class="view-card recovery-note"><i data-lucide="info"></i><div><strong>安全操作会被记录</strong><p>启用因素、生成恢复码、吊销会话等变更会写入审计日志，并需要重新验证管理员身份。</p></div><button class="text-button" data-view-action="security-log">查看日志<i data-lucide="arrow-up-right"></i></button></section>`)
};

viewTemplates.assistant = () => viewFrame('KPanel intelligence / 工作台', 'AI 运维助手', '多 Provider、多模型、多会话；读取真实主机状态，写操作逐次确认。', '<button class="button button-secondary" data-view-action="provider-settings"><i data-lucide="sliders-horizontal"></i>Provider 设置</button><button class="button button-primary" data-view-action="new-chat"><i data-lucide="plus"></i>新建会话</button>', `<div class="assistant-layout"><section class="chat-panel"><div class="chat-top"><div><span class="panel-kicker">当前会话</span><h2>生产环境巡检建议</h2></div><span class="soft-badge blue-badge">GPT-5</span></div><div class="chat-messages"><div class="message user-message"><span class="message-avatar">YL</span><p>帮我看一下 hk-edge-02 的磁盘和容器状态。</p></div><div class="message ai-message"><span class="ai-message-icon"><i data-lucide="sparkles"></i></span><div><p>hk-edge-02 当前磁盘使用率为 <strong>91%</strong>，主要占用来自 <code>/var/lib/docker</code>。我还发现 3 个容器镜像有可用更新。</p><div class="tool-result"><span class="tool-check"><i data-lucide="check"></i></span><div><strong>已读取固定工具</strong><small>host.get_status · docker.list_containers</small></div><span class="tool-time">1.2s</span></div><div class="suggested-action"><i data-lucide="lightbulb"></i><span><strong>建议</strong><small>先清理 7 天前的容器日志，再检查镜像更新。</small></span><button class="mini-button" data-view-action="review-proposal">查看提案</button></div></div></div></div><div class="chat-composer"><input class="chat-input" placeholder="询问主机状态或生成运维建议…" /><button class="icon-button send-button" data-view-action="send-chat" title="发送"><i data-lucide="arrow-up"></i></button></div><div class="composer-note"><i data-lucide="lock"></i>AI 只能通过固定 KPanel 工具读取数据，所有写操作都需要你确认。</div></section><aside class="assistant-side"><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">运行上下文</span><h2>当前范围</h2></div><button class="icon-button compact" data-view-action="context-settings" title="上下文设置"><i data-lucide="settings-2"></i></button></div><div class="context-host"><span class="host-indicator local"></span><div><strong>本机 + hk-edge-02</strong><small>2 台主机 · 只读模式</small></div></div><div class="select-stack"><label>Provider<select class="select-input"><option>OpenAI</option><option>Anthropic</option><option>Google</option></select></label><label>模型<select class="select-input"><option>GPT-5</option><option>Claude 3.7 Sonnet</option><option>Gemini 2.5 Pro</option></select></label></div></section><section class="view-card memory-card"><span class="panel-kicker">管理员审核</span><h2>记忆与流程提案</h2><p>当前有 2 条提案等待审核，未生效。</p><button class="text-button" data-view-action="review-memory">查看待审核内容<i data-lucide="arrow-up-right"></i></button></section></aside></div>`);

viewTemplates.assistant = () => viewFrame('AI 运维助手 / 只读诊断', 'AI 诊断', '快速查看主机异常、资源趋势和固定工具结果；完整聊天助手从右下角打开。', '<button class="button button-secondary" data-view-action="provider-settings"><i data-lucide="settings-2"></i>AI 设置</button><button class="button button-primary" data-view-action="open-ai-drawer"><i data-lucide="message-circle"></i>打开聊天助手</button>', `<div class="diagnosis-grid"><section class="view-card diagnosis-summary"><div class="view-card-head"><div><span class="panel-kicker">当前诊断范围</span><h2>本机 / kp-control-plane</h2></div><span class="soft-badge green-badge">状态良好</span></div><div class="diagnosis-score"><div><span>健康评分</span><strong>92</strong><small>/ 100</small></div><div class="diagnosis-bars"><span><i style="width:31%"></i></span><span><i style="width:64%"></i></span><span><i style="width:52%"></i></span></div><div class="diagnosis-legend"><span>CPU <b>31%</b></span><span>内存 <b>64%</b></span><span>磁盘 <b>52%</b></span></div></div><div class="diagnosis-note"><i data-lucide="sparkles"></i><p>最近一次诊断发现 1 项建议：检查系统更新与 Swap 使用情况。</p></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">快速入口</span><h2>开始一次诊断</h2></div><i class="secure-icon" data-lucide="shield-check"></i></div><div class="diagnosis-actions"><button data-view-action="open-ai-drawer" data-diagnosis="disk"><i data-lucide="hard-drive"></i><span><strong>磁盘诊断</strong><small>空间、I/O、Docker 日志</small></span><i data-lucide="arrow-up-right"></i></button><button data-view-action="open-ai-drawer" data-diagnosis="service"><i data-lucide="activity"></i><span><strong>服务诊断</strong><small>失败服务、端口、进程</small></span><i data-lucide="arrow-up-right"></i></button><button data-view-action="open-ai-drawer" data-diagnosis="network"><i data-lucide="network"></i><span><strong>网络诊断</strong><small>线路、DNS、延迟、丢包</small></span><i data-lucide="arrow-up-right"></i></button></div></section></div><section class="view-card diagnosis-tool-card"><div class="view-card-head"><div><span class="panel-kicker">固定工具结果</span><h2>最近一次 AI 诊断</h2></div><span class="panel-note"><span class="live-dot"></span>2 分钟前</span></div><div class="tool-result-grid"><div><span class="tool-result-icon good"><i data-lucide="check"></i></span><span><strong>host.get_status</strong><small>CPU、内存、磁盘状态已读取</small></span></div><div><span class="tool-result-icon good"><i data-lucide="check"></i></span><span><strong>service.list</strong><small>42 个系统服务运行正常</small></span></div><div><span class="tool-result-icon warn"><i data-lucide="info"></i></span><span><strong>system.update_check</strong><small>发现 12 个可更新软件包</small></span></div></div></section>`);

viewTemplates['ai-settings'] = () => `<div class="ai-settings-view"><div class="ai-settings-header"><div><div class="eyebrow"><span class="eyebrow-line"></span>KPanel intelligence</div><h1>AI 设置</h1><p>连接模型服务，系统会在后台学习稳定偏好和成功流程，可随时停用或回滚。</p></div><button class="icon-button" data-view-action="ai-back" title="返回 AI 助手"><i data-lucide="x"></i></button></div><nav class="settings-tabs"><button class="selected" data-view-action="ai-tab">API 与模型</button><button data-view-action="ai-tab">后台记忆</button><button data-view-action="ai-tab">后台流程</button><button data-view-action="ai-tab">待处理 <b>2</b></button></nav><div class="ai-settings-layout"><aside class="ai-connection-sidebar"><div class="connection-sidebar-head"><div><h2>模型连接</h2><span>0 个 API</span></div><button class="icon-button" data-view-action="add-api" title="添加 API"><i data-lucide="plus"></i></button></div><div class="connection-empty"><i data-lucide="key-round"></i><strong>还没有 API</strong><span>选择右侧预设开始配置</span></div><button class="dashed-add" data-view-action="add-api"><i data-lucide="plus"></i>添加 API</button><div class="sidebar-safe-note"><i data-lucide="lock-keyhole"></i><span>密钥仅加密保存在这台 KPanel 主机</span></div></aside><main class="api-setup-main"><div class="setup-intro"><span class="panel-kicker">QUICK SETUP</span><h2>添加模型 API</h2><p>选择服务、填写密钥，KPanel 会自动测试连接并同步模型。</p></div><div class="setup-steps"><div class="active"><b>1</b><span>选择服务</span></div><i></i><div><b>2</b><span>连接验证</span></div><i></i><div><b>3</b><span>启用模型</span></div></div><section class="setup-card"><div class="setup-card-title"><div><h2>选择服务</h2><p>常用服务已预设协议和地址</p></div><i data-lucide="sliders-horizontal"></i></div><div class="provider-grid"><button class="provider-option selected" data-view-action="select-provider" data-provider="OpenAI"><span class="provider-logo openai-logo">O</span><strong>OpenAI</strong><i data-lucide="check"></i></button><button class="provider-option" data-view-action="select-provider" data-provider="Anthropic"><span class="provider-logo anthropic-logo">A</span><strong>Anthropic</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="Google Gemini"><span class="provider-logo google-logo">G</span><strong>Google Gemini</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="OpenRouter"><span class="provider-logo router-logo">O</span><strong>OpenRouter</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="自定义"><span class="provider-logo custom-logo"><i data-lucide="sliders-horizontal"></i></span><strong>自定义</strong></button></div><label class="setup-select-label">更多预设<select class="select-input"><option>OpenAI</option><option>Anthropic</option><option>Google Gemini</option><option>OpenRouter</option></select></label></section><section class="setup-card connection-card"><div class="setup-card-title"><div><h2>连接信息</h2><p>密钥只加密保存在这台 KPanel 主机</p></div><i class="secure-icon" data-lucide="shield-check"></i></div><div class="form-grid"><label>显示名称<input class="setup-input" value="OpenAI" /></label><label>协议<select class="select-input"><option>OpenAI-compatible</option><option>Anthropic Messages</option><option>Google Generative AI</option></select></label></div><label class="setup-field">API 模式<select class="select-input"><option>Responses API（OpenAI 推荐）</option><option>Chat Completions</option></select><small>第三方兼容服务不支持 Responses 时，请选择 Chat Completions。</small></label><label class="setup-field">Base URL<input class="setup-input mono-input" value="https://api.openai.com/v1" /></label><label class="setup-field">API Key<div class="secret-input"><input class="setup-input mono-input" type="password" placeholder="sk-..." /><button class="icon-button compact" data-view-action="toggle-secret" title="显示密钥"><i data-lucide="eye"></i></button></div><small>密钥只会发送到你配置的服务地址，不会上传到 KPanel 云端。</small></label><div class="model-line"><div><strong>默认模型</strong><span>用于 AI 运维助手的新会话</span></div><select class="select-input"><option>gpt-5</option><option>gpt-5-mini</option><option>o4-mini</option></select></div><div class="setup-footer"><span class="form-security"><i data-lucide="lock"></i>本地加密存储</span><div><button class="button button-secondary" data-view-action="test-provider"><i data-lucide="plug-zap"></i>测试连接</button><button class="button button-primary" data-view-action="save-provider"><i data-lucide="check"></i>保存并启用</button></div></div></section></main></div></div>`;

const aiSettingsPanels = {
  memory: `<div class="setup-intro"><span class="panel-kicker">ADMIN REVIEW / MEMORY</span><h2>后台记忆</h2><p>AI 可以整理重复的运维偏好，但只有管理员审核后才会生效。</p></div><section class="setup-card"><div class="setup-card-title"><div><h2>记忆策略</h2><p>控制哪些信息可以被建议保存</p></div><span class="soft-badge green-badge">已启用审核</span></div><div class="setting-row"><div><i data-lucide="brain"></i><span><strong>偏好记忆</strong><small>记录常用主机、时间窗口和展示方式</small></span></div><button class="toggle on" data-view-action="settings-toggle"><span></span></button></div><div class="setting-row"><div><i data-lucide="shield-check"></i><span><strong>敏感信息过滤</strong><small>API Key、密码、Token 永不进入记忆</small></span></div><span class="soft-badge green-badge">强制开启</span></div><div class="setting-row"><div><i data-lucide="clock-3"></i><span><strong>自动过期</strong><small>未使用的记忆 90 天后进入待清理</small></span></div><button class="mini-button" data-view-action="memory-policy">调整</button></div></section><section class="setup-card"><div class="setup-card-title"><div><h2>待审核记忆</h2><p>AI 提交的内容不会自动写入</p></div><span class="soft-badge warning-badge">2 条待审核</span></div><div class="pending-memory"><div><span class="pending-icon"><i data-lucide="lightbulb"></i></span><span><strong>偏好使用 sg-prod-01 作为默认示例主机</strong><small>来源：3 次连续对话 · 今天 09:18</small></span></div><div><button class="mini-button" data-view-action="reject-memory">拒绝</button><button class="mini-button primary-mini" data-view-action="approve-memory">审核通过</button></div></div><div class="pending-memory"><div><span class="pending-icon"><i data-lucide="lightbulb"></i></span><span><strong>系统变更前先运行体检</strong><small>来源：AI 流程提案 · 昨天 17:42</small></span></div><div><button class="mini-button" data-view-action="reject-memory">拒绝</button><button class="mini-button primary-mini" data-view-action="approve-memory">审核通过</button></div></div></section>`,
  flow: `<div class="setup-intro"><span class="panel-kicker">ADMIN REVIEW / WORKFLOWS</span><h2>后台流程</h2><p>把重复的排障步骤整理成流程草案，执行前仍然逐次确认。</p></div><section class="setup-card"><div class="setup-card-title"><div><h2>流程建议</h2><p>从 AI 对话中提取的可复用步骤</p></div><button class="button button-secondary" data-view-action="new-flow"><i data-lucide="plus"></i>新建流程</button></div><div class="flow-item"><div class="flow-icon"><i data-lucide="hard-drive"></i></div><div><strong>磁盘空间预警排查</strong><small>触发：磁盘使用率超过 85% · 4 个步骤 · 只读检查</small></div><span class="soft-badge green-badge">已审核</span><button class="mini-button" data-view-action="edit-flow">查看</button></div><div class="flow-item"><div class="flow-icon"><i data-lucide="container"></i></div><div><strong>容器更新前检查</strong><small>触发：发现新镜像 · 6 个步骤 · 含备份确认</small></div><span class="soft-badge warning-badge">草稿</span><button class="mini-button" data-view-action="review-flow">审核</button></div><div class="flow-item"><div class="flow-icon"><i data-lucide="shield-alert"></i></div><div><strong>SSH 防御策略变更</strong><small>触发：策略差异 · 8 个步骤 · 高风险写操作</small></div><span class="soft-badge">已暂停</span><button class="mini-button" data-view-action="edit-flow">查看</button></div></section><section class="setup-card flow-safety"><i data-lucide="lock"></i><div><strong>流程安全边界</strong><p>流程只能调用固定 KPanel 工具；涉及配置写入、服务重启和删除的步骤，必须停下来请求管理员确认。</p></div></section>`,
  pending: `<div class="setup-intro"><span class="panel-kicker">ADMIN REVIEW / INBOX</span><h2>待处理</h2><p>需要你确认的 API 变更、记忆和运维流程集中在这里。</p></div><section class="setup-card"><div class="review-summary"><div><span>待审核项目</span><strong>2</strong></div><div><span>高风险写操作</span><strong class="warn-text">1</strong></div><div><span>过期提案</span><strong>0</strong></div></div><div class="review-item"><span class="review-icon warn"><i data-lucide="triangle-alert"></i></span><div><strong>SSH 防御策略 · hk-edge-02</strong><small>配置存在版本冲突 · 需要对比后确认</small></div><span class="soft-badge warning-badge">高风险</span><button class="button button-secondary" data-view-action="open-audit">查看审计</button></div><div class="review-item"><span class="review-icon"><i data-lucide="brain"></i></span><div><strong>AI 记忆与流程提案</strong><small>2 条建议等待管理员审核 · 不会自动生效</small></div><span class="soft-badge">低风险</span><button class="button button-secondary" data-view-action="review-memory">审核</button></div></section>`
};

function setupDomesticProviders() {
  const grid = viewPage.querySelector('.provider-grid');
  if (!grid) return;
  grid.innerHTML = `<button class="provider-option selected" data-view-action="select-provider" data-provider="DeepSeek"><span class="provider-logo deepseek-logo">D</span><strong>DeepSeek</strong><i data-lucide="check"></i></button><button class="provider-option" data-view-action="select-provider" data-provider="智谱 GLM"><span class="provider-logo zhipu-logo">智</span><strong>智谱 GLM</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="通义千问"><span class="provider-logo qwen-logo">Q</span><strong>通义千问</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="Kimi"><span class="provider-logo kimi-logo">K</span><strong>Kimi</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="MiniMax"><span class="provider-logo minimax-logo">M</span><strong>MiniMax</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="OpenAI-compatible"><span class="provider-logo custom-logo"><i data-lucide="sliders-horizontal"></i></span><strong>自定义兼容</strong></button>`;
  const nameInput = viewPage.querySelector('.connection-card input');
  const baseInput = viewPage.querySelector('.connection-card .mono-input');
  const modelSelect = viewPage.querySelector('.model-line .select-input');
  if (nameInput) nameInput.value = 'DeepSeek';
  if (baseInput) baseInput.value = 'https://api.deepseek.com';
  if (modelSelect) modelSelect.innerHTML = '<option>deepseek-chat</option><option>deepseek-reasoner</option>';
  lucide.createIcons();
}

function bindOverviewView() {
  viewPage.querySelectorAll('[data-section]').forEach(item => item.addEventListener('click', () => setSection(item.dataset.section)));
  viewPage.querySelectorAll('.segmented-control button').forEach(button => button.addEventListener('click', () => {
    viewPage.querySelectorAll('.segmented-control button').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected'); showToast(`已切换到${button.textContent.trim()}资源趋势`);
  }));
  viewPage.querySelectorAll('.host-row').forEach(row => row.addEventListener('click', event => {
    if (event.target.closest('.row-menu')) return;
    viewPage.querySelectorAll('.host-row').forEach(item => item.classList.remove('selected-row'));
    row.classList.add('selected-row'); showToast(`已选中主机：${row.dataset.host}，正在展开实时详情`);
  }));
  viewPage.querySelector('#refresh-button')?.addEventListener('click', event => {
    const button = event.currentTarget; button.classList.add('is-loading'); button.querySelector('svg').style.transform = 'rotate(360deg)'; showToast('正在同步 12 台在线主机的最新状态…');
    setTimeout(() => { button.classList.remove('is-loading'); button.querySelector('svg').style.transform = ''; showToast('状态已更新 · 09:41:36'); }, 900);
  });
  viewPage.querySelector('#add-host-button')?.addEventListener('click', openModal);
  viewPage.querySelector('#open-ai-button')?.addEventListener('click', openAiDrawer);
  viewPage.querySelector('#host-filter')?.addEventListener('click', () => showToast('筛选：全部状态 · 在线 12 · 需关注 2'));
  viewPage.querySelectorAll('[data-action="event-detail"]').forEach(item => item.addEventListener('click', () => showToast('事件详情已加入审计队列')));
}

function renderSection(section) {
  if (section === 'overview') {
    viewPage.innerHTML = overviewMarkup;
    bindOverviewView();
    lucide.createIcons();
    applyBranding();
    return;
  }
  if (!viewTemplates[section]) return;
  viewPage.innerHTML = viewTemplates[section]();
  lucide.createIcons();
  applyBranding();
}

viewPage.addEventListener('click', event => {
  const rowMenu = event.target.closest('.row-menu');
  if (rowMenu) {
    const row = rowMenu.closest('.data-row, .host-row');
    showToast(`已打开${row?.querySelector('strong')?.textContent.trim() || '当前项目'}的操作菜单`);
    return;
  }
  const target = event.target.closest('[data-view-action]');
  if (!target) return;
  const action = target.dataset.viewAction;
  if (action === 'provider-settings') {
    viewPage.innerHTML = viewTemplates['ai-settings']();
    breadcrumbCurrent.textContent = 'AI 设置';
    aiApiMarkup = viewPage.querySelector('.api-setup-main')?.innerHTML || '';
    setupDomesticProviders();
    lucide.createIcons();
    applyBranding();
    return;
  }
  if (action === 'ai-back') { setSection('assistant'); return; }
  if (action === 'open-ai-drawer') { openAiDrawer(); return; }
  if (action === 'ai-tab') {
    viewPage.querySelectorAll('.settings-tabs button').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
    const label = target.textContent.trim();
    const main = viewPage.querySelector('.api-setup-main');
    if (label.startsWith('API')) {
      main.innerHTML = aiApiMarkup;
      setupDomesticProviders();
    } else if (label.startsWith('后台记忆')) main.innerHTML = aiSettingsPanels.memory;
    else if (label.startsWith('后台流程')) main.innerHTML = aiSettingsPanels.flow;
    else main.innerHTML = aiSettingsPanels.pending;
    lucide.createIcons();
    showToast(`${label}页面已切换`);
    return;
  }
  if (action === 'select-provider') {
    viewPage.querySelectorAll('.provider-option').forEach(item => { item.classList.remove('selected'); item.querySelector('[data-lucide="check"]')?.remove(); });
    target.classList.add('selected');
    const check = document.createElement('i'); check.dataset.lucide = 'check'; target.appendChild(check);
    const name = target.dataset.provider;
    const nameInput = viewPage.querySelector('.connection-card input');
    const baseInput = viewPage.querySelector('.connection-card .mono-input');
    const modelSelect = viewPage.querySelector('.model-line .select-input');
    if (nameInput && nameInput.type !== 'password') nameInput.value = name;
    if (baseInput && name === 'Anthropic') baseInput.value = 'https://api.anthropic.com';
    if (baseInput && name === 'Google Gemini') baseInput.value = 'https://generativelanguage.googleapis.com';
    if (baseInput && name === 'OpenRouter') baseInput.value = 'https://openrouter.ai/api/v1';
    if (baseInput && name === 'DeepSeek') baseInput.value = 'https://api.deepseek.com';
    if (baseInput && name === '智谱 GLM') baseInput.value = 'https://open.bigmodel.cn/api/paas/v4';
    if (baseInput && name === '通义千问') baseInput.value = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    if (baseInput && name === 'Kimi') baseInput.value = 'https://api.moonshot.cn/v1';
    if (baseInput && name === 'MiniMax') baseInput.value = 'https://api.minimaxi.com/v1';
    const providerModels = {
      'DeepSeek': ['deepseek-chat', 'deepseek-reasoner'],
      '智谱 GLM': ['glm-4.5', 'glm-4.5-air', 'glm-4-flash'],
      '通义千问': ['qwen-plus', 'qwen-max', 'qwen-turbo'],
      'Kimi': ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-k2'],
      'MiniMax': ['MiniMax-M1', 'abab6.5s-chat'],
      'OpenAI-compatible': ['custom-model']
    };
    if (modelSelect && providerModels[name]) modelSelect.innerHTML = providerModels[name].map(model => `<option>${model}</option>`).join('');
    lucide.createIcons();
    showToast(`已选择 ${name}，请继续填写连接信息`);
    return;
  }
  if (action === 'toggle-secret') {
    const input = target.parentElement?.querySelector('input');
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
    return;
  }
  if (action === 'test-provider' || action === 'save-provider') {
    const key = viewPage.querySelector('.secret-input input')?.value.trim();
    if (!key) { showToast('请先填写 API Key，再进行连接验证'); return; }
    const provider = viewPage.querySelector('.provider-option.selected')?.dataset.provider || '自定义兼容';
    const model = viewPage.querySelector('.model-line .select-input')?.value || 'custom-model';
    if (action === 'test-provider') {
      runButtonTask(target, '正在验证 API 地址和密钥…', '连接测试成功 · 已发现 3 个可用模型', 850);
      return;
    }
    runButtonTask(target, '正在加密保存连接配置…', `${provider} API 已保存并启用`, 850, () => {
      primeOpsState.ai.provider = provider;
      primeOpsState.ai.model = model;
      primeOpsState.ai.connected = true;
      const drawerModel = document.getElementById('drawer-model-select');
      if (drawerModel && !Array.from(drawerModel.options).some(option => option.textContent.includes(model))) {
        const option = document.createElement('option'); option.textContent = `${provider} · ${model}`; drawerModel.appendChild(option);
      }
    });
    const sidebarCount = viewPage.querySelector('.connection-sidebar-head span');
    if (sidebarCount) sidebarCount.textContent = '1 个 API';
    const connectionEmpty = viewPage.querySelector('.connection-empty');
    if (connectionEmpty) {
      connectionEmpty.classList.add('has-connection');
      connectionEmpty.innerHTML = `<i data-lucide="check-circle-2"></i><strong>${provider}</strong><span>${model} · 已连接</span>`;
      lucide.createIcons();
    }
    return;
  }
  if (action === 'add-api') { viewPage.querySelector('.setup-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (action === 'open-add-host') { openModal(); return; }
  if (action === 'send-chat') {
    const input = viewPage.querySelector('.chat-input');
    if (!input?.value.trim()) { showToast('请先输入想了解的主机问题'); return; }
    input.value = '';
  }
  if (['system-refresh', 'docker-refresh', 'market-refresh', 'site-scan', 'start-checkup'].includes(action)) {
    const taskCopy = {
      'system-refresh': ['正在读取系统配置…', '系统配置状态已刷新'],
      'docker-refresh': ['正在读取 Docker Engine 状态…', 'Docker 状态已刷新'],
      'market-refresh': ['正在校验应用目录签名…', '应用目录已同步到最新审计版本'],
      'site-scan': ['正在扫描 Nginx、证书与现有站点…', '站点扫描完成 · 发现 8 个站点'],
      'start-checkup': ['体检任务已开始，实时日志正在刷新…', '服务器体检完成 · 综合评分 92']
    }[action];
    runButtonTask(target, taskCopy[0], taskCopy[1], 900);
    return;
  }
  if (action === 'settings-toggle') {
    target.classList.toggle('on');
    showToast(`后台记忆已${target.classList.contains('on') ? '启用审核' : '暂停收集'}`);
    return;
  }
  if (action === 'approve-memory' || action === 'reject-memory') {
    const item = target.closest('.pending-memory');
    const title = item?.querySelector('strong')?.textContent.trim() || '这条提案';
    item?.remove();
    primeOpsState.pendingApprovals = Math.max(0, primeOpsState.pendingApprovals - 1);
    const tabBadge = viewPage.querySelector('.settings-tabs b');
    if (tabBadge) tabBadge.textContent = String(primeOpsState.pendingApprovals);
    viewPage.querySelectorAll('.warning-badge').forEach(badge => { badge.textContent = primeOpsState.pendingApprovals ? `${primeOpsState.pendingApprovals} 条待审核` : '已清空'; });
    showToast(`${title}已${action === 'approve-memory' ? '审核通过' : '拒绝'}，不会自动执行主机变更`);
    return;
  }
  const writeActions = ['confirm-write', 'restore-site', 'install-app', 'update-app', 'container-backup', 'container-migrate', 'approve-conflict', 'enable-totp', 'generate-recovery', 'rotate-key', 'revoke-all', 'revoke-session'];
  if (writeActions.includes(action)) {
    const row = target.closest('.setting-row, .security-list > div, .session-list > div, .view-card, .review-item');
    const subject = row?.querySelector('strong')?.textContent.trim() || target.textContent.trim() || '这项操作';
    openWriteConfirmation({
      title: `确认${subject}？`,
      description: 'PrimeOps 会先校验当前配置，记录审计日志；确认后只加入执行队列，不会绕过管理员审核。',
      confirmLabel: action === 'confirm-write' ? '确认变更' : '确认并加入队列',
      onConfirm: () => {
        if (target.classList.contains('toggle')) target.classList.toggle('on');
        showToast(`${subject}已确认，任务进入执行队列`);
      }
    });
    return;
  }
  if (action === 'open-audit') { setSection('audit'); return; }
  if (action === 'review-memory') {
    viewPage.innerHTML = viewTemplates['ai-settings']();
    breadcrumbCurrent.textContent = 'AI 设置';
    aiApiMarkup = viewPage.querySelector('.api-setup-main')?.innerHTML || '';
    setupDomesticProviders();
    viewPage.querySelectorAll('.settings-tabs button').forEach(item => item.classList.toggle('selected', item.textContent.includes('待处理')));
    viewPage.querySelector('.api-setup-main').innerHTML = aiSettingsPanels.pending;
    lucide.createIcons();
    applyBranding();
    return;
  }
  if (action === 'market-filter') {
    viewPage.querySelectorAll('.filter-chip').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
  }
  const messages = {
    'node-command': '只读节点安装命令已复制到终端队列', 'cluster-filter': '集群筛选已切换：全部节点', 'node-policy': '节点策略详情已打开',
    'system-refresh': '系统配置状态已刷新', 'system-update': '检测到 12 个可更新软件包，写入前需要确认', 'confirm-write': '写操作已加入待确认队列，当前未修改主机', 'kernel-presets': '内核预设已打开',
    'site-scan': '正在扫描 Nginx、证书与现有站点…', 'new-site': '站点创建向导已打开', 'site-filter': '站点筛选已切换', 'site-detail': '站点详情已打开', 'restore-site': '还原操作需要管理员确认',
    'docker-refresh': 'Docker 状态已刷新', 'docker-compose': '脚本交互终端已打开', 'container-filter': '容器筛选已切换：运行中', 'docker-settings': 'Docker 访问控制已打开', 'container-detail': '容器详情已打开', 'container-logs': '正在连接容器实时日志…', 'container-backup': '容器备份向导已打开', 'container-migrate': '迁移前检查已加入任务队列',
    'market-refresh': '应用目录已同步到最新审计版本', 'market-terminal': '应用脚本交互终端已打开', 'market-filter': '应用分类已切换', 'app-manage': 'Nextcloud 管理页已打开', 'install-app': '安装任务已创建，等待确认资源与端口', 'update-app': '更新详情已打开',
    'checkup-history': '历史体检结果已打开', 'start-checkup': '体检任务已开始，实时日志正在刷新', 'copy-log': '体检日志已复制',
    'audit-export': '审计记录导出任务已创建', 'audit-review': '审核队列已打开：2 条待处理', 'view-diff': '配置差异对比已打开', 'approve-conflict': '变更仍需二次确认，当前未写入', 'audit-filter': '审计筛选已切换',
    'security-log': '安全日志已打开', 'enable-totp': 'TOTP 启用向导已打开，完成后会吊销现有 Session', 'generate-recovery': '恢复码生成需要重新验证管理员身份', 'rotate-key': '密钥轮换任务已加入审核队列', 'revoke-all': '全部会话吊销需要二次确认', 'revoke-session': '会话吊销已加入待确认队列', 'send-chat': '消息已发送，AI 正在读取固定主机工具'
  };
  showToast(messages[action] || '操作已加入任务队列');
});
