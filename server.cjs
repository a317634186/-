const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const { execFile } = require('child_process');
const https = require('https');
const crypto = require('crypto');

const root = path.resolve(__dirname);

// ---------- 数据持久化 ----------
// 配置、审计日志、待接入主机等落盘到数据目录，重启后仍在。
const dataDir = process.env.PRIMEOPS_DATA_DIR
  || (process.env.PRIMEOPS_DIR ? path.join(process.env.PRIMEOPS_DIR, 'data') : path.join(root, '.primeops-data'));
try { fs.mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }

function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')); }
  catch { return fallback; }
}
function writeJson(name, value) {
  try { fs.writeFileSync(path.join(dataDir, name), JSON.stringify(value, null, 2)); return true; }
  catch { return false; }
}

// 审计日志：每行一个 JSON，记录通过面板执行的真实写操作。
const auditFile = path.join(dataDir, 'audit.log');
function audit(entry) {
  const line = JSON.stringify(Object.assign({ t: Date.now() }, entry));
  try { fs.appendFileSync(auditFile, line + '\n'); } catch { /* ignore */ }
}
function readAudit(limit = 200) {
  let text = '';
  try { text = fs.readFileSync(auditFile, 'utf8'); } catch { return []; }
  const lines = text.trim().split('\n').filter(Boolean);
  const entries = [];
  for (let i = Math.max(0, lines.length - limit); i < lines.length; i++) {
    try { entries.push(JSON.parse(lines[i])); } catch { /* skip */ }
  }
  return entries.reverse();
}

// 通用 HTTPS 请求（供 AI provider 调用），支持任意方法与请求头。
function httpsFetch(urlString, { method = 'GET', headers = {}, body = null, timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlString); } catch { reject(new Error('bad url')); return; }
    const payload = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: Object.assign({}, headers)
    };
    if (payload) opts.headers['Content-Length'] = payload.length;
    const request = https.request(opts, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, text }));
    });
    request.on('error', reject);
    request.setTimeout(timeout, () => { request.destroy(); reject(new Error('timeout')); });
    if (payload) request.write(payload);
    request.end();
  });
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || '0.0.0.0';
const cacheMaxAge = process.env.NODE_ENV === 'production' ? 86400 : 0;
// 令牌可在运行时轮换：优先环境变量，其次数据目录中已轮换的令牌
let apiToken = process.env.PRIMEOPS_TOKEN || readJson('token.json', {}).token || '';
function clientIp(request) {
  return (request.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || request.socket?.remoteAddress || '未知';
}

const compressible = new Set(['text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'image/svg+xml']);

// 静态资源缓存：filePath -> { mtimeMs, raw, gzip, br, contentType }
// 面板文件基本不变，避免每个请求都重复读盘 + 重新压缩（styles.css 达 89KB）。
const staticCache = new Map();

function run(cmd, args, timeout = 15000) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8', windowsHide: true }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function httpsGetJson(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout }, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { reject(new Error('bad json')); }
      });
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('timeout')); });
  });
}

function safePath(url) {
  let decoded;
  try {
    decoded = decodeURIComponent(url.split('?')[0]);
  } catch {
    return null;
  }
  const resolved = path.join(root, decoded === '/' ? 'index.html' : decoded);
  return resolved === root || resolved.startsWith(root + path.sep) ? resolved : null;
}

// ---------- 真实系统状态 ----------

function cpuPercent() {
  return new Promise(resolve => {
    const start = os.cpus().reduce((acc, cpu) => {
      for (const key of Object.values(cpu.times)) acc.total += key;
      acc.idle += cpu.times.idle;
      return acc;
    }, { total: 0, idle: 0 });
    setTimeout(() => {
      const end = os.cpus().reduce((acc, cpu) => {
        for (const key of Object.values(cpu.times)) acc.total += key;
        acc.idle += cpu.times.idle;
        return acc;
      }, { total: 0, idle: 0 });
      const totalDelta = end.total - start.total;
      const idleDelta = end.idle - start.idle;
      const percent = totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0;
      resolve(Math.max(0, Math.min(100, percent)));
    }, 150);
  });
}

function parseDf(text) {
  const lines = text.trim().split('\n');
  // 定位「Use%」列（如 "44%"），据此取 Used / Available / Mount，
  // 这样即使文件系统名含空格也不会错位。
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    const pctIdx = parts.findIndex(p => /^\d+%$/.test(p));
    if (pctIdx >= 3) {
      const used = Number(parts[pctIdx - 2]) || 0;
      const available = Number(parts[pctIdx - 1]) || 0;
      const total = used + available;
      if (total > 0) {
        return {
          total, used, available,
          percent: Math.round((used / total) * 100),
          mount: parts[pctIdx + 1] || '/'
        };
      }
    }
  }
  return null;
}

function localIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const item of interfaces[name] || []) {
      if (item.family === 'IPv4' && !item.internal) return item.address;
    }
  }
  return '127.0.0.1';
}

const history = [];
function pushSample() {
  const memTotal = os.totalmem();
  const memPercent = memTotal > 0 ? Math.round(((memTotal - os.freemem()) / memTotal) * 100) : 0;
  history.push({ t: Date.now(), mem: memPercent });
  if (history.length > 576) history.shift();
}
async function sampleWithCpu() {
  const cpu = await cpuPercent();
  if (history.length) history[history.length - 1].cpu = cpu;
  return cpu;
}
pushSample();
setTimeout(pushSample, 1500);

async function apiSystem() {
  const cpu = await sampleWithCpu();
  const memTotal = os.totalmem();
  const memUsed = memTotal - os.freemem();
  const dfResult = process.platform === 'win32' ? { ok: false } : await run('df', ['-B1', '/']);
  const disk = dfResult.ok ? parseDf(dfResult.stdout) : null;
  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    kernel: os.release(),
    arch: os.arch(),
    uptime: os.uptime(),
    loadavg: os.loadavg().map(v => Number(v.toFixed(2))),
    cpu: { percent: cpu, cores: os.cpus().length, model: os.cpus()[0]?.model?.trim() || '' },
    memory: { total: memTotal, used: memUsed, percent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0 },
    disk,
    ip: localIp(),
    node: process.version
  };
}

// ---------- Docker 真实数据 ----------

let dockerAvailableCache = { at: 0, value: false };
async function dockerAvailable() {
  // Docker 是否可用短时间内不会变，缓存 30s 以省去每次请求多 spawn 一个进程
  if (Date.now() - dockerAvailableCache.at < 30000) return dockerAvailableCache.value;
  const version = await run('docker', ['--version'], 8000);
  dockerAvailableCache = { at: Date.now(), value: version.ok };
  return version.ok;
}

async function apiDockerContainers() {
  if (!(await dockerAvailable())) {
    return { available: false, containers: [] };
  }
  const result = await run('docker', ['ps', '-a', '--format', '{{json .}}'], 15000);
  if (!result.ok) return { available: false, error: result.stderr.trim(), containers: [] };
  const containers = result.stdout.trim().split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  return { available: true, containers };
}

async function apiDockerImages() {
  if (!(await dockerAvailable())) {
    return { available: false, images: [] };
  }
  const result = await run('docker', ['images', '--format', '{{json .}}'], 15000);
  if (!result.ok) return { available: false, error: result.stderr.trim(), images: [] };
  const images = result.stdout.trim().split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  return { available: true, images };
}

function validContainerId(id) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(id);
}

const IMAGE_REF = /^[a-z0-9][a-z0-9._/-]*(:[a-zA-Z0-9._-]+)?(@sha256:[a-f0-9]{64})?$/;

// ---------- 应用市场（精选目录 + Docker Hub 在线搜索） ----------

const marketCatalog = [
  { name: 'Nginx', image: 'nginx:alpine', category: '建站', icon: 'globe-2', description: '高性能 Web 服务器与反向代理。', port: '80', run: 'docker run -d --name nginx --restart unless-stopped -p 80:80 nginx:alpine' },
  { name: 'WordPress', image: 'wordpress:latest', category: '建站', icon: 'pen-tool', description: '全球最流行的建站系统，需搭配 MySQL。', port: '8080', run: 'docker run -d --name wordpress --restart unless-stopped -p 8080:80 wordpress:latest' },
  { name: 'Ghost', image: 'ghost:alpine', category: '建站', icon: 'feather', description: '现代化博客与出版平台。', port: '2368', run: 'docker run -d --name ghost --restart unless-stopped -p 2368:2368 ghost:alpine' },
  { name: 'MySQL', image: 'mysql:8.4', category: '数据库', icon: 'database', description: '最流行的开源关系型数据库。', port: '3306', run: 'docker run -d --name mysql --restart unless-stopped -e MYSQL_ROOT_PASSWORD=改成你的密码 -p 3306:3306 mysql:8.4' },
  { name: 'PostgreSQL', image: 'postgres:16-alpine', category: '数据库', icon: 'database-zap', description: '功能强大的企业级关系数据库。', port: '5432', run: 'docker run -d --name postgres --restart unless-stopped -e POSTGRES_PASSWORD=改成你的密码 -p 5432:5432 postgres:16-alpine' },
  { name: 'Redis', image: 'redis:7-alpine', category: '数据库', icon: 'layers', description: '高速内存缓存与消息队列。', port: '6379', run: 'docker run -d --name redis --restart unless-stopped -p 6379:6379 redis:7-alpine' },
  { name: 'Uptime Kuma', image: 'louislam/uptime-kuma:1', category: '监控', icon: 'activity', description: '漂亮易用的服务在线状态监控。', port: '3001', run: 'docker run -d --name uptime-kuma --restart unless-stopped -p 3001:3001 louislam/uptime-kuma:1' },
  { name: 'Grafana', image: 'grafana/grafana', category: '监控', icon: 'bar-chart-3', description: '指标可视化与仪表盘。', port: '3000', run: 'docker run -d --name grafana --restart unless-stopped -p 3000:3000 grafana/grafana' },
  { name: 'Prometheus', image: 'prom/prometheus', category: '监控', icon: 'radio-tower', description: '时序指标采集与告警。', port: '9090', run: 'docker run -d --name prometheus --restart unless-stopped -p 9090:9090 prom/prometheus' },
  { name: 'Portainer', image: 'portainer/portainer-ce', category: '工具', icon: 'container', description: '图形化 Docker 管理面板。', port: '9443', run: 'docker run -d --name portainer --restart unless-stopped -p 9443:9443 portainer/portainer-ce' },
  { name: 'Vaultwarden', image: 'vaultwarden/server', category: '工具', icon: 'key-round', description: '自托管密码管理器（Bitwarden 兼容）。', port: '8222', run: 'docker run -d --name vaultwarden --restart unless-stopped -p 8222:80 vaultwarden/server' },
  { name: 'AList', image: 'xhofe/alist:latest', category: '工具', icon: 'folder-tree', description: '多网盘聚合挂载与文件列表。', port: '5244', run: 'docker run -d --name alist --restart unless-stopped -p 5244:5244 xhofe/alist:latest' },
  { name: 'Jellyfin', image: 'jellyfin/jellyfin', category: '媒体', icon: 'film', description: '自托管影视媒体库服务器。', port: '8096', run: 'docker run -d --name jellyfin --restart unless-stopped -p 8096:8096 jellyfin/jellyfin' },
  { name: 'Nextcloud', image: 'nextcloud', category: '媒体', icon: 'cloud', description: '自托管网盘与协作办公套件。', port: '8081', run: 'docker run -d --name nextcloud --restart unless-stopped -p 8081:80 nextcloud' }
];

let searchCache = { key: '', at: 0, data: null };

async function apiMarketSearch(query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return { results: [] };
  const cacheKey = trimmed;
  if (searchCache.key === cacheKey && Date.now() - searchCache.at < 5 * 60 * 1000) {
    return searchCache.data;
  }
  const data = await httpsGetJson(`https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(trimmed)}&page_size=24`);
  const results = (data.results || []).map(item => ({
    name: item.repo_name,
    description: (item.short_description || '').slice(0, 120),
    stars: item.star_count,
    pulls: item.pull_count,
    isOfficial: item.is_official,
    image: item.repo_name
  }));
  const payload = { results };
  searchCache = { key: cacheKey, at: Date.now(), data: payload };
  return payload;
}

// ---------- AI 运维助手（真实 LLM 调用 + 只读主机工具） ----------

const AI_CONFIG_FILE = 'ai.json';
function loadAiConfig() {
  return readJson(AI_CONFIG_FILE, { provider: '', protocol: 'openai', baseUrl: '', apiKey: '', model: '', apiMode: 'chat', updatedAt: 0 });
}
function aiConfigPublic(cfg) {
  return {
    provider: cfg.provider || '',
    protocol: cfg.protocol || 'openai',
    baseUrl: cfg.baseUrl || '',
    model: cfg.model || '',
    apiMode: cfg.apiMode || 'chat',
    hasKey: Boolean(cfg.apiKey),
    keyHint: cfg.apiKey ? `${cfg.apiKey.slice(0, 3)}…${cfg.apiKey.slice(-4)}` : '',
    connected: Boolean(cfg.apiKey),
    updatedAt: cfg.updatedAt || 0
  };
}

// 只读主机工具：AI 通过这些工具读取本机真实状态，绝不执行写操作。
const aiTools = [
  { type: 'function', function: { name: 'get_host_status', description: '获取本机 CPU、内存、磁盘、负载、运行时间等实时状态', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_docker_containers', description: '列出本机所有 Docker 容器及其运行状态', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_disk_usage', description: '获取各挂载点磁盘使用情况（df -h）', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_failed_services', description: '列出 systemd 中处于失败状态的服务', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_container_logs', description: '获取指定容器最近日志', parameters: { type: 'object', properties: { name: { type: 'string', description: '容器名称或 ID' }, tail: { type: 'number', description: '返回行数，默认 100' } }, required: ['name'] } } }
];

async function runAiTool(name, args) {
  try {
    if (name === 'get_host_status') return await apiSystem();
    if (name === 'list_docker_containers') return await apiDockerContainers();
    if (name === 'get_disk_usage') {
      if (process.platform === 'win32') return { error: 'windows 无 df' };
      const r = await run('df', ['-h']);
      return { output: r.stdout.slice(0, 4000) };
    }
    if (name === 'list_failed_services') {
      if (process.platform === 'win32') return { error: 'windows 无 systemd' };
      const r = await run('systemctl', ['--failed', '--no-legend', '--plain']);
      return { output: r.stdout.trim() || '没有失败的服务' };
    }
    if (name === 'get_container_logs') {
      const id = String(args?.name || '');
      if (!validContainerId(id)) return { error: '无效容器名' };
      const tail = Math.min(500, Math.max(1, Number(args?.tail) || 100));
      const r = await run('docker', ['logs', '--tail', String(tail), id], 15000);
      return { output: (r.ok ? r.stdout : r.stderr).slice(-4000) };
    }
  } catch (e) { return { error: String(e?.message || e) }; }
  return { error: '未知工具' };
}

function aiEndpoint(cfg, suffix) {
  const base = (cfg.baseUrl || '').replace(/\/+$/, '');
  return base + suffix;
}

// OpenAI 兼容协议：真实 function-calling 循环（DeepSeek / 智谱 / 通义 / Kimi / OpenRouter / Gemini-compat 等）
async function aiChatOpenAI(cfg, messages) {
  const usedTools = [];
  let convo = messages.slice();
  for (let iteration = 0; iteration < 5; iteration++) {
    const res = await httpsFetch(aiEndpoint(cfg, '/chat/completions'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: { model: cfg.model, messages: convo, tools: aiTools, tool_choice: 'auto', temperature: 0.3, stream: false }
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`${res.status} ${res.text.slice(0, 300)}`);
    const data = JSON.parse(res.text);
    const choice = data.choices?.[0];
    const msg = choice?.message;
    if (!msg) throw new Error('模型无返回');
    if (msg.tool_calls && msg.tool_calls.length) {
      convo.push(msg);
      for (const call of msg.tool_calls) {
        let parsed = {};
        try { parsed = JSON.parse(call.function.arguments || '{}'); } catch { /* ignore */ }
        usedTools.push(call.function.name);
        const result = await runAiTool(call.function.name, parsed);
        convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 6000) });
      }
      continue;
    }
    return { reply: msg.content || '', tools: usedTools };
  }
  return { reply: '（已达到工具调用上限，请缩小问题范围）', tools: usedTools };
}

// Anthropic Messages 协议：注入真实主机快照到 system 提示
async function aiChatAnthropic(cfg, messages, hostContext) {
  const system = messages.find(m => m.role === 'system')?.content || '';
  const rest = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }));
  const res = await httpsFetch(aiEndpoint(cfg, '/v1/messages'), {
    method: 'POST',
    headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: { model: cfg.model, max_tokens: 1024, system: `${system}\n\n[本机实时状态]\n${hostContext}`, messages: rest }
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`${res.status} ${res.text.slice(0, 300)}`);
  const data = JSON.parse(res.text);
  const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  return { reply, tools: ['host.snapshot'] };
}

async function apiAiChat(userMessages) {
  const cfg = loadAiConfig();
  if (!cfg.apiKey || !cfg.baseUrl || !cfg.model) {
    return { error: '尚未配置 AI 模型，请先在「AI 设置」填写并保存 API' };
  }
  const sys = await apiSystem();
  const hostContext = `主机名 ${sys.hostname}；系统 ${sys.platform}；CPU ${sys.cpu.percent}%（${sys.cpu.cores} 核）；内存 ${sys.memory.percent}%；磁盘 ${sys.disk ? sys.disk.percent + '%' : '未知'}；负载 ${sys.loadavg.join('/')}；运行 ${Math.round(sys.uptime / 3600)} 小时`;
  const systemPrompt = `你是 PrimeOps 服务器上的 AI 运维助手。你可以调用只读工具查询本机真实状态（CPU、内存、磁盘、Docker、服务、日志），据此给出专业、简洁的中文运维建议。你只能读取，不能执行任何写操作或危险命令；如需变更，请提示用户在面板中手动确认。当前时间 ${new Date().toLocaleString('zh-CN')}。`;
  const messages = [{ role: 'system', content: systemPrompt }, ...userMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 4000) }))];
  try {
    const out = (cfg.protocol === 'anthropic')
      ? await aiChatAnthropic(cfg, messages, hostContext)
      : await aiChatOpenAI(cfg, messages);
    return out;
  } catch (e) {
    return { error: `模型调用失败：${String(e?.message || e).slice(0, 200)}` };
  }
}

async function apiAiTest(cfg) {
  if (!cfg.apiKey || !cfg.baseUrl) return { ok: false, error: '缺少 Base URL 或 API Key' };
  try {
    if (cfg.protocol === 'anthropic') {
      const res = await httpsFetch(aiEndpoint(cfg, '/v1/messages'), {
        method: 'POST', timeout: 15000,
        headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: { model: cfg.model || 'claude-3-5-haiku-latest', max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] }
      });
      return res.status >= 200 && res.status < 300 ? { ok: true } : { ok: false, error: `${res.status} ${res.text.slice(0, 200)}` };
    }
    const res = await httpsFetch(aiEndpoint(cfg, '/models'), {
      method: 'GET', timeout: 15000,
      headers: { Authorization: `Bearer ${cfg.apiKey}` }
    });
    if (res.status >= 200 && res.status < 300) {
      let models = [];
      try { models = (JSON.parse(res.text).data || []).map(m => m.id).slice(0, 8); } catch { /* ignore */ }
      return { ok: true, models };
    }
    return { ok: false, error: `${res.status} ${res.text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 200) };
  }
}

// ---------- 系统管理（真实读取） ----------

function readFileSafe(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

async function apiSystemConfig() {
  if (process.platform === 'win32') return { platform: 'win32', supported: false };
  const sshd = readFileSafe('/etc/ssh/sshd_config');
  const sshLine = re => { const m = sshd.match(re); return m ? m[1].trim() : ''; };
  const fail2ban = await run('systemctl', ['is-active', 'fail2ban'], 5000);
  const cc = readFileSafe('/proc/sys/net/ipv4/tcp_congestion_control').trim();
  const qdisc = readFileSafe('/proc/sys/net/core/default_qdisc').trim();
  const meminfo = readFileSafe('/proc/meminfo');
  const swapTotal = Number((meminfo.match(/SwapTotal:\s+(\d+)/) || [])[1] || 0) * 1024;
  const swapFree = Number((meminfo.match(/SwapFree:\s+(\d+)/) || [])[1] || 0) * 1024;
  const sources = readFileSafe('/etc/apt/sources.list').split('\n').find(l => /^\s*deb\s/.test(l)) || '';
  let aptSync = 0;
  try { aptSync = fs.statSync('/var/lib/apt/lists').mtimeMs; } catch { /* ignore */ }
  return {
    supported: true,
    ssh: {
      port: sshLine(/^\s*Port\s+(\d+)/m) || '22',
      passwordAuth: (sshLine(/^\s*PasswordAuthentication\s+(\w+)/m) || 'yes').toLowerCase(),
      permitRoot: sshLine(/^\s*PermitRootLogin\s+(\S+)/m) || 'yes',
      fail2ban: fail2ban.stdout.trim() === 'active'
    },
    bbr: { congestion: cc || '未知', qdisc: qdisc || '未知', enabled: cc === 'bbr' },
    swap: { total: swapTotal, used: swapTotal - swapFree, enabled: swapTotal > 0 },
    sources: { primary: sources.trim().slice(0, 120), lastSync: aptSync }
  };
}

async function apiUpdateCheck() {
  if (process.platform === 'win32') return { supported: false, count: 0, packages: [] };
  const has = await run('sh', ['-c', 'command -v apt-get'], 4000);
  if (!has.ok) return { supported: false, count: 0, packages: [] };
  const r = await run('apt-get', ['-s', '-o', 'Debug::NoLocking=true', 'upgrade'], 40000);
  const lines = r.stdout.split('\n').filter(l => l.startsWith('Inst '));
  const packages = lines.map(l => l.split(' ')[1]).filter(Boolean);
  return { supported: true, count: packages.length, packages: packages.slice(0, 30) };
}

// ---------- 网站管理（真实 Nginx 扫描） ----------

function parseNginxConf(text) {
  const serverNames = [...text.matchAll(/server_name\s+([^;]+);/g)].map(m => m[1].trim()).join(' ');
  const root = (text.match(/\broot\s+([^;]+);/) || [])[1]?.trim() || '';
  const ssl = /listen[^;]*ssl/.test(text) || /ssl_certificate\s/.test(text);
  const proxy = /proxy_pass\s/.test(text);
  const php = /fastcgi_pass\s/.test(text);
  const ports = [...text.matchAll(/listen\s+(\d+)/g)].map(m => m[1]);
  return { serverNames: serverNames.replace(/\s+/g, ' '), root, ssl, proxy, php, ports: [...new Set(ports)] };
}

async function apiWebsites() {
  if (process.platform === 'win32') return { supported: false, sites: [] };
  const ver = await run('nginx', ['-v'], 5000);
  const installed = ver.ok || /nginx/i.test(ver.stderr);
  const active = (await run('systemctl', ['is-active', 'nginx'], 5000)).stdout.trim() === 'active';
  const phpVer = await run('sh', ['-c', 'php -v 2>/dev/null | head -1'], 5000);
  const dirs = ['/etc/nginx/sites-enabled', '/etc/nginx/conf.d'];
  const sites = [];
  for (const dir of dirs) {
    let files = [];
    try { files = fs.readdirSync(dir); } catch { continue; }
    for (const f of files) {
      if (dir.endsWith('conf.d') && !f.endsWith('.conf')) continue;
      const full = path.join(dir, f);
      const text = readFileSafe(full);
      if (!text || !/server\s*\{/.test(text)) continue;
      const info = parseNginxConf(text);
      sites.push({
        name: info.serverNames || f,
        file: full,
        root: info.root,
        type: info.proxy ? '反向代理' : info.php ? 'PHP' : '静态站',
        ssl: info.ssl,
        ports: info.ports
      });
    }
  }
  // 证书到期
  const certs = [];
  let liveDirs = [];
  try { liveDirs = fs.readdirSync('/etc/letsencrypt/live'); } catch { /* none */ }
  for (const d of liveDirs) {
    if (d === 'README') continue;
    const pem = `/etc/letsencrypt/live/${d}/fullchain.pem`;
    const r = await run('openssl', ['x509', '-enddate', '-noout', '-in', pem], 5000);
    const m = r.stdout.match(/notAfter=(.+)/);
    if (m) {
      const end = new Date(m[1].trim());
      certs.push({ domain: d, expires: end.getTime(), daysLeft: Math.round((end - Date.now()) / 86400000) });
    }
  }
  // 把证书天数并入站点
  for (const s of sites) {
    const cert = certs.find(c => s.name.includes(c.domain));
    if (cert) s.certDaysLeft = cert.daysLeft;
  }
  return {
    supported: true,
    installed,
    active,
    php: (phpVer.stdout.match(/PHP\s+([\d.]+)/) || [])[1] || '',
    sites,
    certs,
    counts: { sites: sites.length, certs: certs.length, ssl: sites.filter(s => s.ssl).length }
  };
}

// ---------- 服务器体检（真实检查） ----------

async function apiCheckup() {
  const sys = await apiSystem();
  const log = [];
  const checks = [];
  let score = 100;
  const stamp = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });
  log.push(`[${stamp()}] 开始体检 · ${sys.hostname}`);

  // CPU
  if (sys.cpu.percent > 85) { checks.push({ name: 'CPU 负载', status: 'warn', detail: `使用率 ${sys.cpu.percent}%` }); score -= 10; log.push(`[${stamp()}] CPU 使用率偏高：${sys.cpu.percent}%`); }
  else { checks.push({ name: 'CPU 负载', status: 'ok', detail: `使用率 ${sys.cpu.percent}%` }); log.push(`[${stamp()}] CPU 正常：${sys.cpu.percent}%`); }
  // 内存
  if (sys.memory.percent > 90) { checks.push({ name: '内存', status: 'warn', detail: `使用率 ${sys.memory.percent}%` }); score -= 10; log.push(`[${stamp()}] 内存紧张：${sys.memory.percent}%`); }
  else { checks.push({ name: '内存', status: 'ok', detail: `使用率 ${sys.memory.percent}%` }); log.push(`[${stamp()}] 内存正常：${sys.memory.percent}%`); }
  // 磁盘
  if (sys.disk) {
    if (sys.disk.percent > 85) { checks.push({ name: '磁盘空间', status: 'warn', detail: `根分区 ${sys.disk.percent}%` }); score -= 15; log.push(`[${stamp()}] 磁盘空间不足：${sys.disk.percent}%`); }
    else { checks.push({ name: '磁盘空间', status: 'ok', detail: `根分区 ${sys.disk.percent}%` }); log.push(`[${stamp()}] 磁盘正常：${sys.disk.percent}%`); }
  }
  // 负载
  const perCore = sys.cpu.cores ? sys.loadavg[0] / sys.cpu.cores : sys.loadavg[0];
  if (perCore > 1.5) { checks.push({ name: '系统负载', status: 'warn', detail: `1 分钟负载 ${sys.loadavg[0]}` }); score -= 10; log.push(`[${stamp()}] 负载偏高：${sys.loadavg[0]}`); }
  else { checks.push({ name: '系统负载', status: 'ok', detail: `1 分钟负载 ${sys.loadavg[0]}` }); log.push(`[${stamp()}] 负载正常：${sys.loadavg[0]}`); }
  // 网络
  if (process.platform !== 'win32') {
    const ping = await run('ping', ['-c', '2', '-w', '4', '1.1.1.1'], 6000);
    const avg = (ping.stdout.match(/=\s*[\d.]+\/([\d.]+)\//) || [])[1];
    if (ping.ok && avg) { checks.push({ name: '网络连通', status: 'ok', detail: `到 1.1.1.1 平均 ${Math.round(avg)}ms` }); log.push(`[${stamp()}] 网络正常：${Math.round(avg)}ms`); }
    else { checks.push({ name: '网络连通', status: 'warn', detail: '外网探测失败' }); score -= 10; log.push(`[${stamp()}] 外网探测失败`); }
  }
  // 内核优化
  const cfg = await apiSystemConfig().catch(() => null);
  if (cfg && cfg.supported) {
    if (!cfg.bbr.enabled) { checks.push({ name: '内核优化', status: 'notice', detail: `拥塞控制 ${cfg.bbr.congestion}，建议启用 BBR` }); score -= 5; log.push(`[${stamp()}] 建议启用 BBR（当前 ${cfg.bbr.congestion}）`); }
    else { checks.push({ name: '内核优化', status: 'ok', detail: 'BBR 已启用' }); log.push(`[${stamp()}] BBR 已启用`); }
    if (!cfg.swap.enabled) { log.push(`[${stamp()}] 未配置 Swap，低内存时建议添加`); }
  }
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? '优秀' : score >= 75 ? '良好' : score >= 60 ? '一般' : '需优化';
  log.push(`[${stamp()}] 体检完成 · 综合评分 ${score}/100（${grade}）`);
  audit({ actor: 'checkup', action: '运行服务器体检', target: sys.hostname, result: `score ${score}` });
  return { at: Date.now(), score, grade, checks, log, impact: { cpuPeak: sys.cpu.percent, mem: sys.memory.percent, cores: sys.cpu.cores } };
}

// ---------- 集群（真实本机节点 + 持久化待接入主机） ----------

async function apiCluster() {
  const sys = await apiSystem();
  const pending = readJson('hosts.json', []);
  const nodes = [{
    name: sys.hostname, role: '本机 / 控制节点', region: '本机', ip: sys.ip, status: 'online',
    cpu: sys.cpu.percent, mem: sys.memory.percent, disk: sys.disk ? sys.disk.percent : null,
    transport: 'local', uptime: sys.uptime
  }];
  return {
    nodes, pending,
    counts: { online: 1, total: 1 + pending.length, pending: pending.length },
    installCommand: `curl -fsSL ${process.env.PRIMEOPS_REPO_URL || 'https://raw.githubusercontent.com/a317634186/-/main'}/primeops.sh -o primeops.sh && sudo bash primeops.sh`
  };
}

// ---------- 账户安全（真实令牌 / 会话 / 限速 / TOTP） ----------

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0; const out = [];
  for (const c of String(str).replace(/=+$/, '').toUpperCase()) {
    const idx = alphabet.indexOf(c); if (idx < 0) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}
function base32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, out = '';
  for (const b of buf) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
function totpAt(secretBuf, step) {
  const counter = Buffer.alloc(8);
  let c = step;
  for (let i = 7; i >= 0; i--) { counter[i] = c & 0xff; c = Math.floor(c / 256); }
  const hmac = crypto.createHmac('sha1', secretBuf).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(bin % 1000000).padStart(6, '0');
}
function verifyTotp(secretBase32, code) {
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  const buf = base32Decode(secretBase32);
  const step = Math.floor(Date.now() / 30000);
  for (let w = -1; w <= 1; w++) if (totpAt(buf, step + w) === code) return true;
  return false;
}

// 登录限速：同一 IP 令牌错误 5 次锁定 15 分钟
const authFails = new Map();
function rateAllowed(ip) { const r = authFails.get(ip); return !(r && r.until > Date.now()); }
function recordAuthFail(ip) {
  const r = authFails.get(ip) || { count: 0, until: 0 };
  r.count += 1;
  if (r.count >= 5) { r.until = Date.now() + 15 * 60 * 1000; r.count = 0; }
  authFails.set(ip, r);
}
function recordAuthOk(ip) { authFails.delete(ip); }

function apiSecurity(request) {
  const sec = readJson('security.json', {});
  return {
    token: { enabled: Boolean(apiToken), source: process.env.PRIMEOPS_TOKEN ? '环境变量' : (sec.tokenRotatedAt ? '已轮换（数据目录）' : '本地开发未启用'), rotatedAt: sec.tokenRotatedAt || 0 },
    rateLimit: { policy: '5 次 / 15 分钟，超限锁定 15 分钟', lockedIps: [...authFails.values()].filter(r => r.until > Date.now()).length },
    session: {
      ip: clientIp(request),
      userAgent: request.headers['user-agent'] || '未知',
      since: Date.now()
    },
    totp: { enabled: Boolean(sec.totpEnabled), enabledAt: sec.totpEnabledAt || 0 }
  };
}

// ---------- HTTP 服务 ----------

function sendJson(response, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  response.writeHead(statusCode, headers);
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; if (body.length > 1e6) request.destroy(); });
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('bad json')); }
    });
    request.on('error', reject);
  });
}

function checkAuth(request) {
  if (!apiToken) return { ok: true };
  const ip = clientIp(request);
  if (!rateAllowed(ip)) return { ok: false, ratelimited: true };
  const ok = request.headers['x-primeops-token'] === apiToken;
  if (ok) recordAuthOk(ip); else recordAuthFail(ip);
  return { ok };
}

async function handleApi(request, response, pathname) {
  const auth = checkAuth(request);
  if (auth.ratelimited) {
    audit({ actor: clientIp(request), action: '登录限速触发', target: pathname, result: 'locked' });
    sendJson(response, 429, { error: '尝试过多，请 15 分钟后再试' });
    return;
  }
  if (!auth.ok) {
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }

  try {
    if (request.method === 'GET' && pathname === '/api/system') {
      sendJson(response, 200, await apiSystem());
      return;
    }
    if (request.method === 'GET' && pathname === '/api/history') {
      sendJson(response, 200, { interval: 30000, samples: history });
      return;
    }
    if (request.method === 'GET' && pathname === '/api/docker/containers') {
      sendJson(response, 200, await apiDockerContainers());
      return;
    }
    if (request.method === 'GET' && pathname === '/api/docker/images') {
      sendJson(response, 200, await apiDockerImages());
      return;
    }
    if (request.method === 'GET' && pathname.startsWith('/api/docker/logs/')) {
      const id = pathname.split('/').pop();
      if (!validContainerId(id)) { sendJson(response, 400, { error: 'bad id' }); return; }
      const result = await run('docker', ['logs', '--tail', '200', id], 15000);
      if (!result.ok) { sendJson(response, 502, { error: result.stderr.trim() || 'failed' }); return; }
      sendJson(response, 200, { logs: result.stdout });
      return;
    }
    const containerAction = pathname.match(/^\/api\/docker\/container\/([^/]+)\/(start|stop|restart)$/);
    if (request.method === 'POST' && containerAction) {
      const [, id, action] = containerAction;
      if (!validContainerId(id)) { sendJson(response, 400, { error: 'bad id' }); return; }
      const result = await run('docker', [action, id], 60000);
      const labels = { start: '启动容器', stop: '停止容器', restart: '重启容器' };
      audit({ actor: clientIp(request), action: labels[action], target: id.slice(0, 20), result: result.ok ? 'ok' : 'failed' });
      if (!result.ok) { sendJson(response, 502, { error: result.stderr.trim() || 'failed' }); return; }
      sendJson(response, 200, { ok: true });
      return;
    }
    if (request.method === 'GET' && pathname === '/api/market') {
      sendJson(response, 200, { apps: marketCatalog });
      return;
    }
    if (request.method === 'GET' && pathname.startsWith('/api/market/search')) {
      const query = new URL(request.url, 'http://localhost').searchParams.get('q') || '';
      sendJson(response, 200, await apiMarketSearch(query));
      return;
    }
    if (request.method === 'POST' && pathname === '/api/market/pull') {
      const body = await readBody(request);
      const image = String(body.image || '');
      if (!IMAGE_REF.test(image)) { sendJson(response, 400, { error: 'invalid image reference' }); return; }
      const result = await run('docker', ['pull', image], 600000);
      audit({ actor: clientIp(request), action: '拉取镜像', target: image, result: result.ok ? 'ok' : 'failed' });
      if (!result.ok) { sendJson(response, 502, { error: result.stderr.trim().slice(-2000) || 'pull failed' }); return; }
      sendJson(response, 200, { ok: true, image });
      return;
    }
    // ---------- AI 运维助手 ----------
    if (request.method === 'GET' && pathname === '/api/ai/config') {
      sendJson(response, 200, aiConfigPublic(loadAiConfig()));
      return;
    }
    if (request.method === 'POST' && pathname === '/api/ai/config') {
      const body = await readBody(request);
      const current = loadAiConfig();
      const cfg = {
        provider: String(body.provider || current.provider || '').slice(0, 60),
        protocol: body.protocol === 'anthropic' ? 'anthropic' : 'openai',
        baseUrl: String(body.baseUrl || '').slice(0, 300),
        // 留空则沿用已保存的密钥，方便只改模型/地址而不重填密钥
        apiKey: body.apiKey ? String(body.apiKey).slice(0, 300) : current.apiKey || '',
        model: String(body.model || '').slice(0, 120),
        apiMode: String(body.apiMode || 'chat').slice(0, 30),
        updatedAt: Date.now()
      };
      if (!/^https:\/\//.test(cfg.baseUrl)) { sendJson(response, 400, { error: 'Base URL 必须以 https:// 开头' }); return; }
      writeJson(AI_CONFIG_FILE, cfg);
      audit({ actor: clientIp(request), action: '保存 AI 配置', target: cfg.provider, result: 'ok' });
      sendJson(response, 200, aiConfigPublic(cfg));
      return;
    }
    if (request.method === 'POST' && pathname === '/api/ai/test') {
      const body = await readBody(request);
      const current = loadAiConfig();
      const cfg = {
        protocol: body.protocol === 'anthropic' ? 'anthropic' : 'openai',
        baseUrl: String(body.baseUrl || current.baseUrl || ''),
        apiKey: body.apiKey ? String(body.apiKey) : current.apiKey || '',
        model: String(body.model || current.model || '')
      };
      sendJson(response, 200, await apiAiTest(cfg));
      return;
    }
    if (request.method === 'POST' && pathname === '/api/ai/chat') {
      const body = await readBody(request);
      const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
      if (!messages.length) { sendJson(response, 400, { error: '缺少消息' }); return; }
      sendJson(response, 200, await apiAiChat(messages));
      return;
    }

    // ---------- 系统管理 ----------
    if (request.method === 'GET' && pathname === '/api/system/config') {
      sendJson(response, 200, await apiSystemConfig());
      return;
    }
    if (request.method === 'GET' && pathname === '/api/system/update-check') {
      sendJson(response, 200, await apiUpdateCheck());
      return;
    }

    // ---------- 网站管理 ----------
    if (request.method === 'GET' && pathname === '/api/websites') {
      sendJson(response, 200, await apiWebsites());
      return;
    }

    // ---------- 服务器体检 ----------
    if ((request.method === 'POST' || request.method === 'GET') && pathname === '/api/checkup') {
      sendJson(response, 200, await apiCheckup());
      return;
    }

    // ---------- 审计 ----------
    if (request.method === 'GET' && pathname === '/api/audit') {
      const entries = readAudit(300);
      const dayAgo = Date.now() - 86400000;
      const today = entries.filter(e => e.t > dayAgo);
      sendJson(response, 200, {
        entries,
        stats: {
          today: today.length,
          failed: entries.filter(e => e.result === 'failed').length,
          locked: entries.filter(e => e.result === 'locked').length
        }
      });
      return;
    }

    // ---------- 集群 ----------
    if (request.method === 'GET' && pathname === '/api/cluster') {
      sendJson(response, 200, await apiCluster());
      return;
    }
    if (request.method === 'POST' && pathname === '/api/cluster/hosts') {
      const body = await readBody(request);
      const endpoint = String(body.endpoint || '').slice(0, 120);
      if (!/^[a-z0-9.-]+:\d{1,5}$/i.test(endpoint)) { sendJson(response, 400, { error: '无效的主机地址（格式 host:port）' }); return; }
      const hosts = readJson('hosts.json', []);
      const host = { id: crypto.randomBytes(4).toString('hex'), endpoint, transport: String(body.transport || 'HTTPS').slice(0, 20), code: `PO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`, createdAt: Date.now(), status: 'pending' };
      hosts.push(host);
      writeJson('hosts.json', hosts);
      audit({ actor: clientIp(request), action: '添加待接入主机', target: endpoint, result: 'ok' });
      sendJson(response, 200, { ok: true, host });
      return;
    }
    const hostDelete = pathname.match(/^\/api\/cluster\/hosts\/([a-f0-9]{8})$/);
    if (request.method === 'DELETE' && hostDelete) {
      const hosts = readJson('hosts.json', []).filter(h => h.id !== hostDelete[1]);
      writeJson('hosts.json', hosts);
      sendJson(response, 200, { ok: true });
      return;
    }

    // ---------- 账户安全 ----------
    if (request.method === 'GET' && pathname === '/api/security') {
      sendJson(response, 200, apiSecurity(request));
      return;
    }
    if (request.method === 'POST' && pathname === '/api/security/totp/setup') {
      const secret = base32Encode(crypto.randomBytes(20));
      const sec = readJson('security.json', {});
      sec.totpPending = secret;
      writeJson('security.json', sec);
      const label = encodeURIComponent(`PrimeOps:${os.hostname()}`);
      sendJson(response, 200, { secret, otpauth: `otpauth://totp/${label}?secret=${secret}&issuer=PrimeOps&period=30&digits=6` });
      return;
    }
    if (request.method === 'POST' && pathname === '/api/security/totp/enable') {
      const body = await readBody(request);
      const sec = readJson('security.json', {});
      if (!sec.totpPending) { sendJson(response, 400, { error: '请先获取密钥' }); return; }
      if (!verifyTotp(sec.totpPending, body.code)) { sendJson(response, 400, { error: '验证码错误，请重试' }); return; }
      const recovery = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
      sec.totpSecret = sec.totpPending;
      sec.totpEnabled = true;
      sec.totpEnabledAt = Date.now();
      sec.recoveryHashes = recovery.map(c => crypto.createHash('sha256').update(c).digest('hex'));
      delete sec.totpPending;
      writeJson('security.json', sec);
      audit({ actor: clientIp(request), action: '启用 TOTP 两步验证', target: os.hostname(), result: 'ok' });
      sendJson(response, 200, { ok: true, recovery });
      return;
    }
    if (request.method === 'POST' && pathname === '/api/security/totp/disable') {
      const body = await readBody(request);
      const sec = readJson('security.json', {});
      if (sec.totpEnabled && !verifyTotp(sec.totpSecret, body.code)) { sendJson(response, 400, { error: '验证码错误' }); return; }
      sec.totpEnabled = false; delete sec.totpSecret; delete sec.recoveryHashes;
      writeJson('security.json', sec);
      audit({ actor: clientIp(request), action: '关闭 TOTP 两步验证', target: os.hostname(), result: 'ok' });
      sendJson(response, 200, { ok: true });
      return;
    }
    if (request.method === 'POST' && pathname === '/api/security/rotate-token') {
      const newToken = crypto.randomBytes(24).toString('hex');
      apiToken = newToken;
      writeJson('token.json', { token: newToken });
      const sec = readJson('security.json', {});
      sec.tokenRotatedAt = Date.now();
      writeJson('security.json', sec);
      audit({ actor: clientIp(request), action: '轮换访问令牌', target: os.hostname(), result: 'ok' });
      sendJson(response, 200, { ok: true, token: newToken });
      return;
    }

    sendJson(response, 404, { error: 'not found' });
  } catch (error) {
    sendJson(response, 500, { error: String(error?.message || error) });
  }
}

function sendRaw(response, headers, data) {
  headers['Content-Length'] = data.length;
  response.writeHead(200, headers);
  response.end(data);
}

const server = http.createServer(async (request, response) => {
  const pathname = request.url.split('?')[0];

  if (pathname.startsWith('/api/')) {
    await handleApi(request, response, pathname);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Method Not Allowed');
    return;
  }

  const filePath = safePath(request.url);
  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  serveStatic(request, response, filePath);
});

async function loadStatic(filePath) {
  const stat = await fs.promises.stat(filePath);
  if (!stat.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
  const cached = staticCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached;

  const raw = await fs.promises.readFile(filePath);
  const contentType = mime[path.extname(filePath)] || 'application/octet-stream';
  let gzip = null, br = null;
  if (compressible.has(contentType.split(';')[0]) && raw.length > 1024) {
    const g = zlib.gzipSync(raw);
    if (g.length < raw.length) gzip = g;
    const b = zlib.brotliCompressSync(raw);
    if (b.length < raw.length) br = b;
  }
  const entry = { mtimeMs: stat.mtimeMs, raw, gzip, br, contentType };
  staticCache.set(filePath, entry);
  return entry;
}

async function serveStatic(request, response, filePath) {
  let entry;
  try {
    entry = await loadStatic(filePath);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const headers = {
    'Content-Type': entry.contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': cacheMaxAge > 0 && ext !== '.html'
      ? `public, max-age=${cacheMaxAge}`
      : 'no-cache, no-store, must-revalidate'
  };

  const acceptEncoding = request.headers['accept-encoding'] || '';
  if (entry.br && acceptEncoding.includes('br')) {
    headers['Content-Encoding'] = 'br';
    headers['Vary'] = 'Accept-Encoding';
    sendRaw(response, headers, entry.br);
  } else if (entry.gzip && acceptEncoding.includes('gzip')) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    sendRaw(response, headers, entry.gzip);
  } else {
    sendRaw(response, headers, entry.raw);
  }
}

// 每 30 秒采样一次资源使用（供趋势图）；启动时多采一个点让图表立即可见
setInterval(pushSample, 30000);

server.listen(port, host, () => {
  console.log(`PrimeOps: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}${apiToken ? ' (API token enabled)' : ''}`);
});
