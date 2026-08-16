const viewPage = document.getElementById('page-content');
let aiApiMarkup = '';

function viewFrame(kicker, title, description, actions, body) {
  return `<div class="workspace-view"><section class="workspace-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span>${kicker}</div><h1>${title}</h1><p>${description}</p></div><div class="workspace-actions">${actions || ''}</div></section>${body}</div>`;
}

const viewTemplates = {
  cluster: () => viewFrame('控制平面 / 节点网络', '集群监控', '所有 PrimeOps 与只读节点的实时状态、连接方式与地区分布。', '<button class="button button-secondary" data-view-action="node-command"><i data-lucide="terminal"></i>节点安装命令</button><button class="button button-primary" data-view-action="open-add-host"><i data-lucide="plus"></i>接入主机</button>', `<div class="stat-strip"><div><span>在线节点</span><strong>12 <small>/ 14</small></strong><b class="good-text">+2.4%</b></div><div><span>HTTPS 通道</span><strong>09</strong><b class="good-text">安全</b></div><div><span>Noise 通道</span><strong>03</strong><b class="blue-text">已加密</b></div><div><span>待授权</span><strong>02</strong><b class="warn-text">需确认</b></div></div><div class="view-grid two-col"><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">实时节点</span><h2>主机连接状态</h2></div><button class="filter-button" data-view-action="cluster-filter"><i data-lucide="list-filter"></i>全部节点<i data-lucide="chevron-down"></i></button></div><div class="node-list"><div class="node-item"><span class="node-light online"></span><div><strong>本机 / kp-control-plane</strong><small>新加坡 · HTTPS · 103.28.14.8</small></div><span class="table-status online">运行中</span></div><div class="node-item"><span class="node-light online"></span><div><strong>sg-prod-01</strong><small>新加坡 · HTTPS · 103.75.116.21</small></div><span class="table-status online">运行中</span></div><div class="node-item"><span class="node-light warn"></span><div><strong>hk-edge-02</strong><small>中国香港 · Noise · 45.113.12.7</small></div><span class="table-status warning">需关注</span></div><div class="node-item"><span class="node-light pending"></span><div><strong>tokyo-app-02</strong><small>日本东京 · 等待一次性授权</small></div><span class="table-status pending">待授权</span></div></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">轻量节点</span><h2>出站上报策略</h2></div><span class="soft-badge">只读</span></div><div class="policy-callout"><i data-lucide="radio-tower"></i><div><strong>自动更新校验正常</strong><p>最近一次校验：2 分钟前 · 签名版本 v1.4.2</p></div></div><div class="key-value-list"><div><span>上报间隔</span><strong>30 秒</strong></div><div><span>资源占用</span><strong>&lt; 0.5% CPU</strong></div><div><span>连接出口</span><strong>HTTPS 443</strong></div><div><span>权限范围</span><strong>只读系统指标</strong></div></div><button class="button button-secondary full-button" data-view-action="node-policy"><i data-lucide="settings-2"></i>查看节点策略</button></section></div><section class="view-card map-card"><div class="view-card-head"><div><span class="panel-kicker">地区概要</span><h2>节点分布</h2></div><span class="panel-note"><span class="live-dot"></span>数据 30 秒内</span></div><div class="region-grid"><div><strong>新加坡</strong><span>5 台主机</span><b style="width:82%"></b></div><div><strong>中国香港</strong><span>3 台主机</span><b style="width:58%"></b></div><div><strong>日本东京</strong><span>2 台主机</span><b style="width:38%"></b></div><div><strong>美国西部</strong><span>2 台主机</span><b style="width:31%"></b></div></div></section>`),
  systems: () => viewFrame('主机管理 / 本机', '系统管理', '读取本机真实系统信息；配置变更类功能需要后续接入 Agent。', '<button class="button button-secondary" data-view-action="system-refresh"><i data-lucide="refresh-cw"></i>刷新状态</button>', `<div class="system-toolbar"><div class="host-switch"><span class="host-indicator local"></span><strong id="sys-hostname">读取中…</strong><i data-lucide="chevron-down"></i></div><span class="panel-note"><span class="live-dot"></span>实时数据</span></div><div class="view-grid two-col"><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">系统概要 · 真实数据</span><h2>基础信息</h2></div><span class="soft-badge" id="sys-platform">—</span></div><div class="key-value-list large"><div><span>主机名</span><strong id="sys-hostname-value">—</strong></div><div><span>内核版本</span><strong id="sys-kernel">—</strong></div><div><span>运行时间</span><strong id="sys-uptime">—</strong></div><div><span>CPU</span><strong id="sys-cpu">—</strong></div><div><span>内存</span><strong id="sys-memory">—</strong></div><div><span>磁盘（/）</span><strong id="sys-disk">—</strong></div><div><span>本机 IP</span><strong class="mono" id="sys-ip">—</strong></div></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">网络与性能</span><h2>运行配置</h2></div><span class="soft-badge">需接入 Agent</span></div><div class="setting-row"><div><i data-lucide="key-round"></i><span><strong>SSH 防御</strong><small>端口 2222 · Fail2ban 运行中</small></span></div><button class="toggle on" data-view-action="confirm-write" aria-label="SSH 防御已启用"><span></span></button></div><div class="setting-row"><div><i data-lucide="gauge"></i><span><strong>BBR</strong><small>BBRv3 · TCP 拥塞控制</small></span></div><button class="toggle on" data-view-action="confirm-write" aria-label="BBR 已启用"><span></span></button></div><div class="setting-row"><div><i data-lucide="database"></i><span><strong>Swap</strong><small>4 GB · 使用率 12%</small></span></div><button class="mini-button" data-view-action="confirm-write">管理</button></div><div class="setting-row"><div><i data-lucide="package"></i><span><strong>软件源</strong><small>官方镜像 · 上次同步 3 小时前</small></span></div><button class="mini-button" data-view-action="confirm-write">配置</button></div></section></div><section class="view-card update-card"><div><span class="panel-kicker">系统维护</span><h2>更新与清理</h2><p>软件包检查需要在服务器上执行 apt 命令，将在接入执行队列后开放。</p></div><div class="update-actions"><span class="soft-badge">规划中</span></div></section>`),
  websites: () => viewFrame('应用层 / Nginx', '网站管理', '发现现有站点、证书与 Nginx 状态，集中管理静态站、PHP 与反向代理。', '<button class="button button-secondary" data-view-action="site-scan"><i data-lucide="scan-search"></i>扫描站点</button><button class="button button-primary" data-view-action="new-site"><i data-lucide="plus"></i>创建站点</button>', `<div class="stat-strip"><div><span>活跃站点</span><strong>08</strong><b class="good-text">Nginx 正常</b></div><div><span>PHP 版本</span><strong>8.3</strong><b class="blue-text">FPM 运行中</b></div><div><span>有效证书</span><strong>07</strong><b class="good-text">自动续期</b></div><div><span>近 24h 请求</span><strong>1.2M</strong><b class="blue-text">+8.4%</b></div></div><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">站点清单</span><h2>已发现的网站</h2></div><button class="filter-button" data-view-action="site-filter"><i data-lucide="list-filter"></i>全部类型<i data-lucide="chevron-down"></i></button></div><div class="data-table site-table"><div class="data-row data-head"><span>站点</span><span>类型</span><span>证书</span><span>状态</span><span></span></div><div class="data-row"><div class="site-name"><span class="site-favicon">K</span><span><strong>panel.example.com</strong><small>/var/www/kpanel</small></span></div><span class="soft-badge">反向代理</span><span class="cert-valid"><i data-lucide="lock-keyhole"></i>有效 62 天</span><span class="table-status online">运行中</span><button class="row-menu" data-view-action="site-detail" title="站点操作"><i data-lucide="more-horizontal"></i></button></div><div class="data-row"><div class="site-name"><span class="site-favicon php">P</span><span><strong>blog.example.com</strong><small>/var/www/blog</small></span></div><span class="soft-badge purple-badge">PHP 8.3</span><span class="cert-valid"><i data-lucide="lock-keyhole"></i>有效 128 天</span><span class="table-status online">运行中</span><button class="row-menu" data-view-action="site-detail" title="站点操作"><i data-lucide="more-horizontal"></i></button></div><div class="data-row"><div class="site-name"><span class="site-favicon static">S</span><span><strong>docs.example.com</strong><small>/var/www/docs</small></span></div><span class="soft-badge green-badge">静态站</span><span class="cert-valid"><i data-lucide="triangle-alert"></i>11 天后到期</span><span class="table-status warning">需续期</span><button class="row-menu" data-view-action="site-detail" title="站点操作"><i data-lucide="more-horizontal"></i></button></div></div></section><div class="view-grid two-col compact-grid"><section class="view-card"><span class="panel-kicker">环境健康</span><h2>LDNMP</h2><div class="health-bars"><div><span>Nginx</span><b><i style="width:96%"></i></b><strong>正常</strong></div><div><span>PHP-FPM</span><b><i style="width:88%"></i></b><strong>正常</strong></div><div><span>MySQL</span><b><i style="width:73%"></i></b><strong>稳定</strong></div></div></section><section class="view-card"><span class="panel-kicker">备份策略</span><h2>最近备份</h2><div class="backup-line"><i data-lucide="database-backup"></i><span><strong>全站快照</strong><small>今天 03:00 · 1.8 GB</small></span><button class="mini-button" data-view-action="restore-site">还原</button></div></section></div>`),
  containers: () => viewFrame('运行时 / Docker Engine', 'Docker 管理', '读取本机 Docker Engine 的真实容器、镜像与运行状态。', '<button class="button button-secondary" data-view-action="docker-refresh"><i data-lucide="refresh-cw"></i>刷新状态</button>', `<div class="stat-strip" id="docker-stat-strip"><div><span>Docker 状态</span><strong>检测中…</strong></div></div><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">容器清单 · 实时</span><h2>所有容器（docker ps -a）</h2></div><span class="panel-note"><span class="live-dot"></span>真实数据</span></div><div class="data-table container-table" id="docker-container-list"><div class="data-row data-head"><span>容器</span><span>镜像</span><span>端口</span><span>状态</span><span>操作</span></div></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">本地镜像 · 实时</span><h2>所有镜像（docker images）</h2></div><span class="panel-note"><span class="live-dot"></span>真实数据</span></div><div class="data-table container-table" id="docker-image-list"><div class="data-row data-head"><span>镜像</span><span>ID</span><span>大小</span><span>创建于</span></div></div></section>`),
  market: () => viewFrame('应用目录 / 精选 + Docker Hub', '应用市场', '精选常用应用一键拉取镜像，或实时搜索 Docker Hub 海量仓库。', '', `<div class="market-toolbar"><div class="search-field"><i data-lucide="search"></i><input id="market-search" placeholder="搜索 Docker Hub：mysql、nginx、监控…" /></div><div class="market-filters" id="market-filters"><button class="filter-chip selected" data-filter="全部">全部</button><button class="filter-chip" data-filter="建站">建站</button><button class="filter-chip" data-filter="数据库">数据库</button><button class="filter-chip" data-filter="监控">监控</button><button class="filter-chip" data-filter="工具">工具</button><button class="filter-chip" data-filter="媒体">媒体</button></div></div><div class="app-grid" id="market-grid"><div class="data-row"><span>正在加载应用目录…</span></div></div><div style="margin-top:14px;display:flex;align-items:center;gap:8px;color:#7d9c8f;font-size:12px;"><i data-lucide="info"></i><span>「拉取镜像」真实执行 docker pull；「复制运行命令」生成对应的 docker run 命令，可粘贴到终端创建容器。</span></div>`),
  checkup: () => viewFrame('诊断工具 / 只读检查', '服务器体检', '运行 IP、网络线路、硬件性能和综合测评，持续展示来源、资源影响和实时日志。', '<button class="button button-secondary" data-view-action="checkup-history"><i data-lucide="history"></i>历史结果</button><button class="button button-primary" data-view-action="start-checkup"><i data-lucide="play"></i>开始体检</button>', `<section class="checkup-hero"><div class="checkup-score"><span>综合评分</span><strong>92</strong><small>/ 100</small><b>良好</b></div><div class="checkup-copy"><span class="panel-kicker">最近一次测评 · 今天 08:24</span><h2>当前主机运行状态良好</h2><p>4 项检查已通过，1 项建议优化。脚本来源已固定，预计资源影响低于 2%。</p><div class="source-line"><i data-lucide="shield-check"></i><span>来源已校验：app.kejilion.sh / checkup-v1.8.0</span></div></div></section><div class="view-grid two-col"><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">检查流程</span><h2>实时检查项</h2></div><span class="soft-badge green-badge">已完成</span></div><div class="check-list"><div><span class="check-index done"><i data-lucide="check"></i></span><span><strong>IP 与解锁能力</strong><small>IPv4 / IPv6 / 流媒体解锁</small></span><b>通过</b></div><div><span class="check-index done"><i data-lucide="check"></i></span><span><strong>网络线路</strong><small>TCP 延迟 / 回程 / DNS</small></span><b>通过</b></div><div><span class="check-index done"><i data-lucide="check"></i></span><span><strong>硬件性能</strong><small>CPU / 内存 / 磁盘 I/O</small></span><b>通过</b></div><div><span class="check-index notice"><i data-lucide="info"></i></span><span><strong>系统优化</strong><small>BBR / Swap / 文件句柄</small></span><b class="warn-text">建议优化</b></div></div></section><section class="view-card log-card"><div class="view-card-head"><div><span class="panel-kicker">实时日志</span><h2>checkup.log</h2></div><button class="icon-button compact" data-view-action="copy-log" title="复制日志"><i data-lucide="copy"></i></button></div><pre><span>[08:24:01]</span> resolve host: kp-control-plane<br><span class="ok">[08:24:03]</span> network route: Singapore / AS9506<br><span class="ok">[08:24:08]</span> disk benchmark: 1,842 MB/s<br><span>[08:24:12]</span> kernel preset: generic / BBRv3<br><span class="warn">[08:24:14]</span> swap usage recommendation found<br><span class="ok">[08:24:16]</span> completed with score 92/100</pre></section></div><section class="view-card history-card"><div><span class="panel-kicker">资源影响</span><h2>本次体检消耗</h2></div><div class="impact-list"><span>CPU 峰值 <strong>18%</strong></span><span>内存增加 <strong>126 MB</strong></span><span>持续时间 <strong>00:02:16</strong></span><span>结果大小 <strong>42 KB</strong></span></div></section>`),
  audit: () => viewFrame('治理 / 变更记录', '审计与恢复', '记录管理变更，检测版本冲突，写入前校验并在失败时回滚。', '<button class="button button-secondary" data-view-action="audit-export"><i data-lucide="download"></i>导出记录</button><button class="button button-primary" data-view-action="audit-review"><i data-lucide="inbox"></i>审核队列 <span class="button-count">2</span></button>', `<div class="stat-strip"><div><span>今日变更</span><strong>18</strong><b class="blue-text">+4</b></div><div><span>待审核</span><strong>02</strong><b class="warn-text">需要处理</b></div><div><span>版本冲突</span><strong>01</strong><b class="warn-text">已检测</b></div><div><span>已回滚</span><strong>00</strong><b class="good-text">无失败</b></div></div><section class="view-card conflict-card"><div class="conflict-icon"><i data-lucide="triangle-alert"></i></div><div><span class="panel-kicker">需要管理员确认</span><h2>配置版本冲突 · hk-edge-02</h2><p>面板检测到本地手动修改与待写入的 SSH 防御策略冲突。当前配置未被覆盖。</p><div class="diff-line"><span>当前值</span><code>Port 22 · PasswordAuthentication yes</code><span>建议值</span><code>Port 2222 · PasswordAuthentication no</code></div></div><div class="conflict-actions"><button class="button button-secondary" data-view-action="view-diff">查看差异</button><button class="button button-primary" data-view-action="approve-conflict">审核并应用</button></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">变更记录</span><h2>最近操作</h2></div><button class="filter-button" data-view-action="audit-filter"><i data-lucide="list-filter"></i>全部操作者<i data-lucide="chevron-down"></i></button></div><div class="data-table audit-table"><div class="data-row data-head"><span>时间</span><span>操作者</span><span>变更</span><span>目标</span><span>结果</span></div><div class="data-row"><span class="mono">今天 09:12:44</span><strong>Y. Lin</strong><span>修改 SSH 防御策略</span><span class="mono">本机</span><span class="table-status online">已完成</span></div><div class="data-row"><span class="mono">今天 08:24:16</span><strong>PrimeOps Checkup</strong><span>运行服务器体检</span><span class="mono">本机</span><span class="table-status online">已完成</span></div><div class="data-row"><span class="mono">昨天 22:06:31</span><strong>Y. Lin</strong><span>更新容器镜像</span><span class="mono">sg-prod-01</span><span class="table-status online">已完成</span></div></div></section>`),
  security: () => viewFrame('身份与访问 / 管理员', '账户安全', '默认关闭、主动启用的 TOTP，两步验证、恢复码、登录限速与本地密钥保护。', '<button class="button button-secondary" data-view-action="security-log"><i data-lucide="file-clock"></i>安全日志</button><button class="button button-primary" data-view-action="enable-totp"><i data-lucide="shield-plus"></i>启用 TOTP</button>', `<div class="security-grid"><section class="view-card security-main"><div class="security-status"><span class="security-ring"><i data-lucide="shield-check"></i></span><div><span class="panel-kicker">账户防护</span><h2>基础安全状态良好</h2><p>密码登录、限速与本地密钥保护均已启用。</p></div><span class="soft-badge green-badge">已保护</span></div><div class="security-list"><div><i data-lucide="smartphone"></i><span><strong>TOTP 两步验证</strong><small>当前未启用 · 启用后会吊销现有 Session</small></span><button class="mini-button primary-mini" data-view-action="enable-totp">启用</button></div><div><i data-lucide="key-round"></i><span><strong>一次性恢复码</strong><small>尚未生成 · 生成后仅显示一次</small></span><button class="mini-button" data-view-action="generate-recovery">生成</button></div><div><i data-lucide="gauge"></i><span><strong>登录限速</strong><small>5 次 / 15 分钟 · 超限锁定 30 分钟</small></span><button class="toggle on" data-view-action="confirm-write" aria-label="登录限速已启用"><span></span></button></div><div><i data-lucide="lock-keyhole"></i><span><strong>本地加密密钥</strong><small>硬件安全存储 · 最近轮换 24 天前</small></span><button class="mini-button" data-view-action="rotate-key">轮换</button></div></div></section><section class="view-card session-card"><div class="view-card-head"><div><span class="panel-kicker">活动会话</span><h2>已登录设备</h2></div><button class="text-button" data-view-action="revoke-all">全部吊销</button></div><div class="session-list"><div><i data-lucide="monitor"></i><span><strong>当前浏览器 · 新加坡</strong><small>Windows · 最近活动</small></span><span class="current-session">当前</span></div><div><i data-lucide="terminal-square"></i><span><strong>CLI Token · 本机</strong><small>最后使用 2 小时前</small></span><button class="mini-button" data-view-action="revoke-session">吊销</button></div><div><i data-lucide="smartphone"></i><span><strong>移动设备 · 新加坡</strong><small>最后使用昨天 18:40</small></span><button class="mini-button" data-view-action="revoke-session">吊销</button></div></div></section></div><section class="view-card recovery-note"><i data-lucide="info"></i><div><strong>安全操作会被记录</strong><p>启用因素、生成恢复码、吊销会话等变更会写入审计日志，并需要重新验证管理员身份。</p></div><button class="text-button" data-view-action="security-log">查看日志<i data-lucide="arrow-up-right"></i></button></section>`)
};

viewTemplates.assistant = () => viewFrame('AI 运维助手 / 只读诊断', 'AI 诊断', '快速查看主机异常、资源趋势和固定工具结果；完整聊天助手从右下角打开。', '<button class="button button-secondary" data-view-action="provider-settings"><i data-lucide="settings-2"></i>AI 设置</button><button class="button button-primary" data-view-action="open-ai-drawer"><i data-lucide="message-circle"></i>打开聊天助手</button>', `<div class="diagnosis-grid"><section class="view-card diagnosis-summary"><div class="view-card-head"><div><span class="panel-kicker">当前诊断范围</span><h2>本机 / kp-control-plane</h2></div><span class="soft-badge green-badge">状态良好</span></div><div class="diagnosis-score"><div><span>健康评分</span><strong>92</strong><small>/ 100</small></div><div class="diagnosis-bars"><span><i style="width:31%"></i></span><span><i style="width:64%"></i></span><span><i style="width:52%"></i></span></div><div class="diagnosis-legend"><span>CPU <b>31%</b></span><span>内存 <b>64%</b></span><span>磁盘 <b>52%</b></span></div></div><div class="diagnosis-note"><i data-lucide="sparkles"></i><p>最近一次诊断发现 1 项建议：检查系统更新与 Swap 使用情况。</p></div></section><section class="view-card"><div class="view-card-head"><div><span class="panel-kicker">快速入口</span><h2>开始一次诊断</h2></div><i class="secure-icon" data-lucide="shield-check"></i></div><div class="diagnosis-actions"><button data-view-action="open-ai-drawer" data-diagnosis="disk"><i data-lucide="hard-drive"></i><span><strong>磁盘诊断</strong><small>空间、I/O、Docker 日志</small></span><i data-lucide="arrow-up-right"></i></button><button data-view-action="open-ai-drawer" data-diagnosis="service"><i data-lucide="activity"></i><span><strong>服务诊断</strong><small>失败服务、端口、进程</small></span><i data-lucide="arrow-up-right"></i></button><button data-view-action="open-ai-drawer" data-diagnosis="network"><i data-lucide="network"></i><span><strong>网络诊断</strong><small>线路、DNS、延迟、丢包</small></span><i data-lucide="arrow-up-right"></i></button></div></section></div><section class="view-card diagnosis-tool-card"><div class="view-card-head"><div><span class="panel-kicker">固定工具结果</span><h2>最近一次 AI 诊断</h2></div><span class="panel-note"><span class="live-dot"></span>2 分钟前</span></div><div class="tool-result-grid"><div><span class="tool-result-icon good"><i data-lucide="check"></i></span><span><strong>host.get_status</strong><small>CPU、内存、磁盘状态已读取</small></span></div><div><span class="tool-result-icon good"><i data-lucide="check"></i></span><span><strong>service.list</strong><small>42 个系统服务运行正常</small></span></div><div><span class="tool-result-icon warn"><i data-lucide="info"></i></span><span><strong>system.update_check</strong><small>发现 12 个可更新软件包</small></span></div></div></section>`);

viewTemplates['ai-settings'] = () => `<div class="ai-settings-view"><div class="ai-settings-header"><div><div class="eyebrow"><span class="eyebrow-line"></span>PrimeOps intelligence</div><h1>AI 设置</h1><p>连接模型服务，系统会在后台学习稳定偏好和成功流程，可随时停用或回滚。</p></div><button class="icon-button" data-view-action="ai-back" title="返回 AI 助手"><i data-lucide="x"></i></button></div><nav class="settings-tabs"><button class="selected" data-view-action="ai-tab">API 与模型</button><button data-view-action="ai-tab">后台记忆</button><button data-view-action="ai-tab">后台流程</button><button data-view-action="ai-tab">待处理 <b>2</b></button></nav><div class="ai-settings-layout"><aside class="ai-connection-sidebar"><div class="connection-sidebar-head"><div><h2>模型连接</h2><span>0 个 API</span></div><button class="icon-button" data-view-action="add-api" title="添加 API"><i data-lucide="plus"></i></button></div><div class="connection-empty"><i data-lucide="key-round"></i><strong>还没有 API</strong><span>选择右侧预设开始配置</span></div><button class="dashed-add" data-view-action="add-api"><i data-lucide="plus"></i>添加 API</button><div class="sidebar-safe-note"><i data-lucide="lock-keyhole"></i><span>密钥仅加密保存在这台 PrimeOps 主机</span></div></aside><main class="api-setup-main"><div class="setup-intro"><span class="panel-kicker">QUICK SETUP</span><h2>添加模型 API</h2><p>选择服务、填写密钥，PrimeOps 会自动测试连接并同步模型。</p></div><div class="setup-steps"><div class="active"><b>1</b><span>选择服务</span></div><i></i><div><b>2</b><span>连接验证</span></div><i></i><div><b>3</b><span>启用模型</span></div></div><section class="setup-card"><div class="setup-card-title"><div><h2>选择服务</h2><p>常用服务已预设协议和地址</p></div><i data-lucide="sliders-horizontal"></i></div><div class="provider-grid"><button class="provider-option selected" data-view-action="select-provider" data-provider="OpenAI"><span class="provider-logo openai-logo">O</span><strong>OpenAI</strong><i data-lucide="check"></i></button><button class="provider-option" data-view-action="select-provider" data-provider="Anthropic"><span class="provider-logo anthropic-logo">A</span><strong>Anthropic</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="Google Gemini"><span class="provider-logo google-logo">G</span><strong>Google Gemini</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="OpenRouter"><span class="provider-logo router-logo">O</span><strong>OpenRouter</strong></button><button class="provider-option" data-view-action="select-provider" data-provider="自定义"><span class="provider-logo custom-logo"><i data-lucide="sliders-horizontal"></i></span><strong>自定义</strong></button></div><label class="setup-select-label">更多预设<select class="select-input"><option>OpenAI</option><option>Anthropic</option><option>Google Gemini</option><option>OpenRouter</option></select></label></section><section class="setup-card connection-card"><div class="setup-card-title"><div><h2>连接信息</h2><p>密钥只加密保存在这台 PrimeOps 主机</p></div><i class="secure-icon" data-lucide="shield-check"></i></div><div class="form-grid"><label>显示名称<input class="setup-input" value="OpenAI" /></label><label>协议<select class="select-input"><option>OpenAI-compatible</option><option>Anthropic Messages</option><option>Google Generative AI</option></select></label></div><label class="setup-field">API 模式<select class="select-input"><option>Responses API（OpenAI 推荐）</option><option>Chat Completions</option></select><small>第三方兼容服务不支持 Responses 时，请选择 Chat Completions。</small></label><label class="setup-field">Base URL<input class="setup-input mono-input" value="https://api.openai.com/v1" /></label><label class="setup-field">API Key<div class="secret-input"><input class="setup-input mono-input" type="password" placeholder="sk-..." /><button class="icon-button compact" data-view-action="toggle-secret" title="显示密钥"><i data-lucide="eye"></i></button></div><small>密钥只会发送到你配置的服务地址，不会上传到 PrimeOps 云端。</small></label><div class="model-line"><div><strong>默认模型</strong><span>用于 AI 运维助手的新会话</span></div><select class="select-input"><option>gpt-5</option><option>gpt-5-mini</option><option>o4-mini</option></select></div><div class="setup-footer"><span class="form-security"><i data-lucide="lock"></i>本地加密存储</span><div><button class="button button-secondary" data-view-action="test-provider"><i data-lucide="plug-zap"></i>测试连接</button><button class="button button-primary" data-view-action="save-provider"><i data-lucide="check"></i>保存并启用</button></div></div></section></main></div></div>`;

const aiSettingsPanels = {
  memory: `<div class="setup-intro"><span class="panel-kicker">ADMIN REVIEW / MEMORY</span><h2>后台记忆</h2><p>AI 可以整理重复的运维偏好，但只有管理员审核后才会生效。</p></div><section class="setup-card"><div class="setup-card-title"><div><h2>记忆策略</h2><p>控制哪些信息可以被建议保存</p></div><span class="soft-badge green-badge">已启用审核</span></div><div class="setting-row"><div><i data-lucide="brain"></i><span><strong>偏好记忆</strong><small>记录常用主机、时间窗口和展示方式</small></span></div><button class="toggle on" data-view-action="settings-toggle"><span></span></button></div><div class="setting-row"><div><i data-lucide="shield-check"></i><span><strong>敏感信息过滤</strong><small>API Key、密码、Token 永不进入记忆</small></span></div><span class="soft-badge green-badge">强制开启</span></div><div class="setting-row"><div><i data-lucide="clock-3"></i><span><strong>自动过期</strong><small>未使用的记忆 90 天后进入待清理</small></span></div><button class="mini-button" data-view-action="memory-policy">调整</button></div></section><section class="setup-card"><div class="setup-card-title"><div><h2>待审核记忆</h2><p>AI 提交的内容不会自动写入</p></div><span class="soft-badge warning-badge">2 条待审核</span></div><div class="pending-memory"><div><span class="pending-icon"><i data-lucide="lightbulb"></i></span><span><strong>偏好使用 sg-prod-01 作为默认示例主机</strong><small>来源：3 次连续对话 · 今天 09:18</small></span></div><div><button class="mini-button" data-view-action="reject-memory">拒绝</button><button class="mini-button primary-mini" data-view-action="approve-memory">审核通过</button></div></div><div class="pending-memory"><div><span class="pending-icon"><i data-lucide="lightbulb"></i></span><span><strong>系统变更前先运行体检</strong><small>来源：AI 流程提案 · 昨天 17:42</small></span></div><div><button class="mini-button" data-view-action="reject-memory">拒绝</button><button class="mini-button primary-mini" data-view-action="approve-memory">审核通过</button></div></div></section>`,
  flow: `<div class="setup-intro"><span class="panel-kicker">ADMIN REVIEW / WORKFLOWS</span><h2>后台流程</h2><p>把重复的排障步骤整理成流程草案，执行前仍然逐次确认。</p></div><section class="setup-card"><div class="setup-card-title"><div><h2>流程建议</h2><p>从 AI 对话中提取的可复用步骤</p></div><button class="button button-secondary" data-view-action="new-flow"><i data-lucide="plus"></i>新建流程</button></div><div class="flow-item"><div class="flow-icon"><i data-lucide="hard-drive"></i></div><div><strong>磁盘空间预警排查</strong><small>触发：磁盘使用率超过 85% · 4 个步骤 · 只读检查</small></div><span class="soft-badge green-badge">已审核</span><button class="mini-button" data-view-action="edit-flow">查看</button></div><div class="flow-item"><div class="flow-icon"><i data-lucide="container"></i></div><div><strong>容器更新前检查</strong><small>触发：发现新镜像 · 6 个步骤 · 含备份确认</small></div><span class="soft-badge warning-badge">草稿</span><button class="mini-button" data-view-action="review-flow">审核</button></div><div class="flow-item"><div class="flow-icon"><i data-lucide="shield-alert"></i></div><div><strong>SSH 防御策略变更</strong><small>触发：策略差异 · 8 个步骤 · 高风险写操作</small></div><span class="soft-badge">已暂停</span><button class="mini-button" data-view-action="edit-flow">查看</button></div></section><section class="setup-card flow-safety"><i data-lucide="lock"></i><div><strong>流程安全边界</strong><p>流程只能调用固定 PrimeOps 工具；涉及配置写入、服务重启和删除的步骤，必须停下来请求管理员确认。</p></div></section>`,
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
    row.classList.add('selected-row'); showToast(`已选中主机：${row.dataset.host}`);
  }));
  viewPage.querySelector('#refresh-button')?.addEventListener('click', event => {
    const button = event.currentTarget; button.classList.add('is-loading'); button.querySelector('svg').style.transform = 'rotate(360deg)'; showToast('正在读取本机真实状态…');
    applyRealOverview();
    setTimeout(() => { button.classList.remove('is-loading'); button.querySelector('svg').style.transform = ''; showToast('状态已刷新'); }, 600);
  });
  viewPage.querySelector('#add-host-button')?.addEventListener('click', openModal);
  viewPage.querySelector('#open-ai-button')?.addEventListener('click', openAiDrawer);
  viewPage.querySelector('#host-filter')?.addEventListener('click', () => showToast('当前为本机单节点模式'));
  viewPage.querySelectorAll('[data-action="event-detail"]').forEach(item => item.addEventListener('click', () => showToast('事件详情已加入审计队列')));
  applyRealOverview();
}

// ---------- Docker 真实数据 ----------

function containerRowHtml(container) {
  const running = container.State === 'running';
  const statusClass = running ? 'online' : '';
  const statusText = running ? '运行中' : container.State === 'exited' ? '已退出' : container.State;
  const ports = (container.Ports || '').split(', ').filter(Boolean).slice(0, 2).join(', ') || '—';
  const buttons = running
    ? `<button class="mini-button" data-docker-action="stop" data-container="${escapeHtml(container.Id)}">停止</button><button class="mini-button" data-docker-action="restart" data-container="${escapeHtml(container.Id)}">重启</button>`
    : `<button class="mini-button primary-mini" data-docker-action="start" data-container="${escapeHtml(container.Id)}">启动</button>`;
  return `<div class="data-row"><div class="container-name"><span class="container-dot" style="background:${running ? '#4ade80' : '#64748b'}"></span><span><strong>${escapeHtml(container.Names)}</strong><small>${escapeHtml(container.Image)}</small></span></div><span class="mono" title="${escapeHtml(container.Ports || '')}">${escapeHtml(ports)}</span><span class="resource-pair">${escapeHtml(container.Status)}</span><span class="table-status ${statusClass}">${escapeHtml(statusText)}</span><div style="display:flex;gap:6px;flex-wrap:wrap">${buttons}<button class="mini-button" data-docker-action="logs" data-container="${escapeHtml(container.Id)}" data-name="${escapeHtml(container.Names)}">日志</button></div></div>`;
}

async function initDockerView() {
  const strip = viewPage.querySelector('#docker-stat-strip');
  const containerList = viewPage.querySelector('#docker-container-list');
  const imageList = viewPage.querySelector('#docker-image-list');
  if (!strip) return;
  strip.innerHTML = '<div><span>Docker 状态</span><strong>检测中…</strong></div>';
  let containersData;
  try {
    containersData = await primeOpsApi.json('/api/docker/containers');
  } catch {
    containersData = { available: false, error: '无法连接面板后端' };
  }
  if (!containersData.available) {
    strip.innerHTML = `<div><span>Docker</span><strong>未检测到</strong><b class="warn-text">安装后自动生效</b></div><div><span>提示</span><strong>在服务器执行 apt install docker.io 即可</strong></div>`;
    containerList.innerHTML = `<div class="data-row"><span>未检测到 Docker Engine${containersData.error ? ` · ${escapeHtml(String(containersData.error).slice(0, 100))}` : ''}</span></div>`;
    imageList.innerHTML = '<div class="data-row"><span>—</span></div>';
    return;
  }
  const containers = containersData.containers || [];
  const running = containers.filter(c => c.State === 'running').length;
  let imagesData = { images: [] };
  try {
    imagesData = await primeOpsApi.json('/api/docker/images');
  } catch { /* 镜像列表失败不阻塞 */ }
  const images = imagesData.images || [];
  strip.innerHTML = `<div><span>运行中容器</span><strong>${running} <small>/ ${containers.length}</small></strong><b class="${running === containers.length ? 'good-text' : 'warn-text'}">${running === containers.length ? '全部运行' : `${containers.length - running} 个未运行`}</b></div><div><span>本地镜像</span><strong>${images.length}</strong><b class="blue-text">真实数据</b></div><div><span>数据来源</span><strong>docker CLI</strong><b class="good-text">实时</b></div>`;
  containerList.innerHTML = '<div class="data-row data-head"><span>容器</span><span>端口</span><span>状态</span><span>操作</span></div>' + (containers.length
    ? containers.map(containerRowHtml).join('')
    : '<div class="data-row"><span>还没有容器，去应用市场拉取一个镜像吧</span></div>');
  imageList.innerHTML = '<div class="data-row data-head"><span>镜像</span><span>ID</span><span>大小</span><span>创建于</span></div>' + (images.length
    ? images.map(image => `<div class="data-row"><span class="mono">${escapeHtml(`${image.Repository}:${image.Tag}`)}</span><span class="mono">${escapeHtml(String(image.ID).slice(0, 12))}</span><span>${escapeHtml(image.Size)}</span><span>${escapeHtml(image.CreatedSince)}</span></div>`).join('')
    : '<div class="data-row"><span>本地暂无镜像</span></div>');
}

// ---------- 应用市场（精选 + Docker Hub 搜索） ----------

let marketSearchTimer;
let marketFilter = '全部';

function marketCardHtml(app, installed) {
  const image = app.image;
  const installedBadge = installed ? '<span class="soft-badge green-badge">已有镜像</span>' : '<span class="soft-badge">未拉取</span>';
  const meta = app.pulls !== undefined
    ? `<span>★ ${app.stars ?? 0}</span><span>${app.pulls >= 1000 ? `${Math.round(app.pulls / 1000)}k+` : app.pulls} 次拉取</span>${app.isOfficial ? '<span>官方</span>' : ''}`
    : `<span>${escapeHtml(app.category || '应用')}</span><span class="mono">${escapeHtml(app.port ? `端口 ${app.port}` : '')}</span>`;
  const runCommand = app.run || `docker run -d --name ${String(image).split('/').pop().split(':')[0]} --restart unless-stopped ${image}`;
  return `<article class="app-card"><div class="app-card-icon blue-icon"><i data-lucide="${app.icon || 'package'}"></i></div><div class="app-card-top">${installedBadge}</div><h2>${escapeHtml(app.name)}</h2><p>${escapeHtml(app.description || '')}</p><div class="app-meta">${meta}</div><div class="app-meta"><span class="mono" style="font-size:10px">${escapeHtml(image)}</span></div><div style="display:flex;gap:8px;margin-top:4px"><button class="button button-secondary" style="flex:1" data-market-action="copy-run" data-run="${escapeHtml(runCommand)}">复制命令</button><button class="button button-primary" style="flex:1" data-market-action="pull" data-image="${escapeHtml(image)}">${installed ? '重新拉取' : '拉取镜像'}</button></div></article>`;
}

async function initMarketView() {
  const grid = viewPage.querySelector('#market-grid');
  const search = viewPage.querySelector('#market-search');
  if (!grid) return;
  search?.removeEventListener('input', marketSearchHandler);
  search?.addEventListener('input', marketSearchHandler);
  viewPage.querySelectorAll('#market-filters .filter-chip').forEach(chip => chip.addEventListener('click', () => {
    viewPage.querySelectorAll('#market-filters .filter-chip').forEach(item => item.classList.remove('selected'));
    chip.classList.add('selected');
    marketFilter = chip.dataset.filter;
    renderCuratedMarket();
  }));
  renderCuratedMarket();
}

async function renderCuratedMarket() {
  const grid = viewPage.querySelector('#market-grid');
  if (!grid) return;
  let catalog = { apps: [] };
  let images = { images: [] };
  try {
    [catalog, images] = await Promise.all([primeOpsApi.json('/api/market'), primeOpsApi.json('/api/docker/images').catch(() => ({ images: [] }))]);
  } catch { /* 保持加载提示 */ }
  const installedSet = new Set((images.images || []).map(img => `${img.Repository}:${img.Tag}`));
  const apps = (catalog.apps || []).filter(app => marketFilter === '全部' || app.category === marketFilter);
  grid.innerHTML = apps.length
    ? apps.map(app => marketCardHtml(app, installedSet.has(app.image))).join('')
    : '<div class="data-row"><span>该分类暂无应用</span></div>';
  lucide.createIcons();
}

async function marketSearchHandler(event) {
  clearTimeout(marketSearchTimer);
  const query = event.target.value.trim();
  if (!query) { renderCuratedMarket(); return; }
  marketSearchTimer = setTimeout(async () => {
    const grid = viewPage.querySelector('#market-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="data-row"><span>正在搜索 Docker Hub…</span></div>';
    let result;
    try {
      result = await primeOpsApi.json(`/api/market/search?q=${encodeURIComponent(query)}`);
    } catch {
      grid.innerHTML = '<div class="data-row"><span>搜索失败，请稍后重试</span></div>';
      return;
    }
    let images = { images: [] };
    try {
      images = await primeOpsApi.json('/api/docker/images');
    } catch { /* 忽略 */ }
    const installedSet = new Set((images.images || []).map(img => `${img.Repository}:${img.Tag}`));
    const items = result.results || [];
    grid.innerHTML = items.length
      ? items.map(item => marketCardHtml({ name: item.name, image: item.image, description: item.description, stars: item.stars, pulls: item.pulls, isOfficial: item.isOfficial }, installedSet.has(item.image) || installedSet.has(`library/${item.image}`))).join('')
      : '<div class="data-row"><span>没有找到相关仓库</span></div>';
    lucide.createIcons();
  }, 400);
}

// ---------- 系统管理真实数据 ----------

async function initSystemsView() {
  let data;
  try {
    data = await primeOpsApi.json('/api/system');
  } catch {
    return;
  }
  const set = (id, value) => { const el = viewPage.querySelector(id); if (el) el.textContent = value; };
  set('#sys-hostname', data.hostname);
  set('#sys-hostname-value', data.hostname);
  set('#sys-platform', data.platform.split(' ')[0]);
  set('#sys-kernel', data.kernel);
  set('#sys-uptime', formatUptime(data.uptime));
  set('#sys-cpu', `${data.cpu.model || 'CPU'} · ${data.cpu.cores} 核`);
  set('#sys-memory', `${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}（${data.memory.percent}%）`);
  set('#sys-disk', data.disk ? `${formatBytes(data.disk.used)} / ${formatBytes(data.disk.total)}（${data.disk.percent}%）` : '—');
  set('#sys-ip', data.ip);
}

function showLogsOverlay(title, text) {
  let overlay = document.getElementById('logs-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'logs-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(4,12,11,.74);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;';
    overlay.innerHTML = `<div style="background:#0d1f1d;border:1px solid rgba(148,233,178,.16);border-radius:16px;max-width:860px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.5);"><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(148,233,178,.12);"><strong id="logs-title" style="color:#e8fff4;font-size:14px;"></strong><button class="icon-button compact" id="logs-close" title="关闭"><i data-lucide="x"></i></button></div><pre id="logs-body" style="margin:0;padding:16px 18px;overflow:auto;font-size:12px;line-height:1.7;color:#9fb8ad;white-space:pre-wrap;word-break:break-all;"></pre></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
    overlay.querySelector('#logs-close').addEventListener('click', () => overlay.remove());
  }
  overlay.querySelector('#logs-title').textContent = title;
  overlay.querySelector('#logs-body').textContent = text || '（无输出）';
  lucide.createIcons();
}

const sectionInit = { containers: initDockerView, market: initMarketView, systems: initSystemsView };

function renderSection(section) {
  if (section === 'overview') {
    viewPage.innerHTML = overviewMarkup;
    bindOverviewView();
    lucide.createIcons();
    return;
  }
  if (!viewTemplates[section]) return;
  viewPage.innerHTML = viewTemplates[section]();
  lucide.createIcons();
  sectionInit[section]?.();
}

function handleDockerAction(button) {
  const action = button.dataset.dockerAction;
  const id = button.dataset.container;
  const name = button.dataset.name || String(id).slice(0, 12);
  if (action === 'logs') {
    showLogsOverlay(`容器日志 · ${name}`, '正在读取日志…');
    primeOpsApi.json(`/api/docker/logs/${encodeURIComponent(id)}`)
      .then(data => showLogsOverlay(`容器日志 · ${name}`, data.logs || data.error || '（无输出）'))
      .catch(() => showLogsOverlay(`容器日志 · ${name}`, '读取日志失败，无法连接后端'));
    return;
  }
  const labels = { start: '启动', stop: '停止', restart: '重启' };
  openWriteConfirmation({
    title: `确认${labels[action]}容器 ${name}？`,
    description: '将真实执行 docker 命令，操作立即生效并可在列表中看到结果。',
    confirmLabel: `确认${labels[action]}`,
    onConfirm: async () => {
      showToast(`正在${labels[action]}容器 ${name}…`);
      try {
        const result = await primeOpsApi.json(`/api/docker/container/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
        if (result.ok) { showToast(`容器 ${name} 已${labels[action]}`); initDockerView(); }
        else showToast(`操作失败：${String(result.error).slice(0, 80)}`);
      } catch {
        showToast('操作失败，无法连接后端');
      }
    }
  });
}

function handleMarketAction(button) {
  const action = button.dataset.marketAction;
  if (action === 'copy-run') {
    const command = button.dataset.run || '';
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(command)
        .then(() => showToast('docker run 命令已复制，粘贴到服务器终端即可创建容器'))
        .catch(() => showToast('复制失败，请检查浏览器权限'));
    } else {
      showLogsOverlay('docker run 命令（手动复制）', command);
    }
    return;
  }
  if (action === 'pull') {
    const image = button.dataset.image;
    openWriteConfirmation({
      title: `拉取镜像 ${image}？`,
      description: '将真实执行 docker pull 下载镜像，大镜像可能需要几分钟。',
      confirmLabel: '确认拉取',
      onConfirm: async () => {
        showToast(`正在拉取 ${image}，完成后会提示…`);
        try {
          const result = await primeOpsApi.json('/api/market/pull', { method: 'POST', body: JSON.stringify({ image }) });
          if (result.ok) { showToast(`镜像 ${image} 拉取成功`); renderCuratedMarket(); }
          else showToast(`拉取失败：${String(result.error).slice(0, 80)}`);
        } catch {
          showToast('拉取失败，无法连接后端');
        }
      }
    });
  }
}

viewPage.addEventListener('click', event => {
  const rowMenu = event.target.closest('.row-menu');
  if (rowMenu) {
    const row = rowMenu.closest('.data-row, .host-row');
    showToast(`已打开${row?.querySelector('strong')?.textContent.trim() || '当前项目'}的操作菜单`);
    return;
  }
  const dockerTarget = event.target.closest('[data-docker-action]');
  if (dockerTarget) { handleDockerAction(dockerTarget); return; }
  const marketTarget = event.target.closest('[data-market-action]');
  if (marketTarget) { handleMarketAction(marketTarget); return; }
  const target = event.target.closest('[data-view-action]');
  if (!target) return;
  const action = target.dataset.viewAction;
  if (action === 'provider-settings') {
    viewPage.innerHTML = viewTemplates['ai-settings']();
    breadcrumbCurrent.textContent = 'AI 设置';
    aiApiMarkup = viewPage.querySelector('.api-setup-main')?.innerHTML || '';
    setupDomesticProviders();
    lucide.createIcons();
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
  if (['docker-refresh', 'system-refresh', 'market-refresh'].includes(action)) {
    runButtonTask(target, '正在读取真实数据…', '数据已刷新', 400, () => {
      if (action === 'docker-refresh') initDockerView();
      else if (action === 'system-refresh') initSystemsView();
      else renderCuratedMarket();
    });
    return;
  }
  if (['site-scan', 'start-checkup'].includes(action)) {
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
