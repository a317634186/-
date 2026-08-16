const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const { execFile } = require('child_process');
const https = require('https');

const root = path.resolve(__dirname);
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
const API_TOKEN = process.env.PRIMEOPS_TOKEN || '';

const compressible = new Set(['text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'image/svg+xml']);

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
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
    if (parts.length >= 6 && /^\d+%?$/.test(parts[4]) === false && /%/.test(parts[4])) {
      const used = Number(parts[2]) || 0;
      const available = Number(parts[3]) || 0;
      const total = used + available;
      if (total > 0) {
        return {
          total, used, available,
          percent: Math.round((used / total) * 100),
          mount: parts[5]
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

async function dockerAvailable() {
  const version = await run('docker', ['--version'], 8000);
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

function authorized(request) {
  return !API_TOKEN || request.headers['x-primeops-token'] === API_TOKEN;
}

async function handleApi(request, response, pathname) {
  if (!authorized(request)) {
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
      if (!result.ok) { sendJson(response, 502, { error: result.stderr.trim().slice(-2000) || 'pull failed' }); return; }
      sendJson(response, 200, { ok: true, image });
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

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mime[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };

    if (cacheMaxAge > 0 && ext !== '.html') {
      headers['Cache-Control'] = `public, max-age=${cacheMaxAge}`;
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }

    const acceptEncoding = request.headers['accept-encoding'] || '';
    const shouldCompress = compressible.has(contentType.split(';')[0]) && data.length > 1024;

    if (shouldCompress && acceptEncoding.includes('br')) {
      zlib.brotliCompress(data, (err, compressed) => {
        if (err || !compressed || compressed.length >= data.length) {
          sendRaw(response, headers, data);
        } else {
          headers['Content-Encoding'] = 'br';
          headers['Content-Length'] = compressed.length;
          response.writeHead(200, headers);
          response.end(compressed);
        }
      });
    } else if (shouldCompress && acceptEncoding.includes('gzip')) {
      zlib.gzip(data, (err, compressed) => {
        if (err || !compressed || compressed.length >= data.length) {
          sendRaw(response, headers, data);
        } else {
          headers['Content-Encoding'] = 'gzip';
          headers['Content-Length'] = compressed.length;
          response.writeHead(200, headers);
          response.end(compressed);
        }
      });
    } else {
      sendRaw(response, headers, data);
    }
  });
});

// 每 30 秒采样一次资源使用（供趋势图）；启动时多采一个点让图表立即可见
setInterval(pushSample, 30000);

server.listen(port, host, () => {
  console.log(`PrimeOps: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}${API_TOKEN ? ' (API token enabled)' : ''}`);
});
