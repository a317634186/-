const toast = document.getElementById('toast');
const modalBackdrop = document.getElementById('modal-backdrop');
const breadcrumbCurrent = document.getElementById('breadcrumb-current');
let toastTimer;
const pageContent = document.getElementById('page-content');
const overviewMarkup = pageContent.innerHTML;
const primeOpsState = window.primeOpsState = {
  pendingHosts: [],
  ai: { provider: 'DeepSeek', model: 'deepseek-chat', connected: false },
  pendingApprovals: 2
};
let pendingConfirmation = null;
let authGenerated = false;

const sectionNames = {
  overview: '主机总览', cluster: '集群监控', assistant: 'AI 运维助手', systems: '系统管理', websites: '网站管理',
  containers: 'Docker 管理', market: '应用市场', checkup: '服务器体检', audit: '审计与恢复', security: '账户安全'
};

function showToast(message) {
  toast.querySelector('span').textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function runButtonTask(button, startMessage, completeMessage, duration = 700, onComplete) {
  if (!button || button.classList.contains('is-loading')) return;
  button.classList.add('is-loading');
  button.disabled = true;
  showToast(startMessage);
  window.setTimeout(() => {
    button.classList.remove('is-loading');
    button.disabled = false;
    showToast(completeMessage);
    onComplete?.();
  }, duration);
}

function openWriteConfirmation({ title, description, confirmLabel = '确认并加入执行队列', onConfirm }) {
  const backdrop = document.getElementById('confirm-backdrop');
  pendingConfirmation = onConfirm;
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-description').textContent = description;
  document.getElementById('approve-confirm').textContent = confirmLabel;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.getElementById('approve-confirm').focus();
}

function closeWriteConfirmation() {
  const backdrop = document.getElementById('confirm-backdrop');
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  pendingConfirmation = null;
}

function setSection(section) {
  const name = sectionNames[section] || sectionNames.overview;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === section));
  breadcrumbCurrent.textContent = name;
  renderSection(section);
  if (section !== 'overview') showToast(`${name}模块已准备就绪，正在加载实时数据…`);
  if (window.innerWidth <= 720) document.querySelector('.sidebar').classList.remove('open');
}

document.querySelectorAll('[data-section]').forEach(item => item.addEventListener('click', () => setSection(item.dataset.section)));
document.getElementById('mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

document.querySelectorAll('.segmented-control button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.segmented-control button').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
  showToast(`已切换到${button.textContent.trim()}资源趋势`);
}));

document.querySelectorAll('.host-row').forEach(row => row.addEventListener('click', event => {
  if (event.target.closest('.row-menu')) return;
  document.querySelectorAll('.host-row').forEach(item => item.classList.remove('selected-row'));
  row.classList.add('selected-row');
  showToast(`已选中主机：${row.dataset.host}，正在展开实时详情`);
}));

document.getElementById('refresh-button').addEventListener('click', event => {
  const button = event.currentTarget;
  button.classList.add('is-loading');
  button.querySelector('svg').style.transform = 'rotate(360deg)';
  showToast('正在同步 12 台在线主机的最新状态…');
  setTimeout(() => {
    button.classList.remove('is-loading');
    button.querySelector('svg').style.transform = '';
    showToast('状态已更新 · 09:41:36');
  }, 900);
});

function openModal() {
  authGenerated = false;
  modalBackdrop.querySelector('input').value = '';
  modalBackdrop.querySelector('#auth-result').hidden = true;
  document.getElementById('continue-modal').innerHTML = '生成授权码<i data-lucide="arrow-right"></i>';
  lucide.createIcons();
  modalBackdrop.classList.add('open');
  modalBackdrop.setAttribute('aria-hidden', 'false');
  modalBackdrop.querySelector('input').focus();
}
function closeModal() { modalBackdrop.classList.remove('open'); modalBackdrop.setAttribute('aria-hidden', 'true'); }
document.getElementById('add-host-button').addEventListener('click', openModal);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-modal').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

document.getElementById('cancel-confirm').addEventListener('click', closeWriteConfirmation);
document.getElementById('confirm-backdrop').addEventListener('click', event => { if (event.target.id === 'confirm-backdrop') closeWriteConfirmation(); });
document.getElementById('approve-confirm').addEventListener('click', () => {
  const callback = pendingConfirmation;
  closeWriteConfirmation();
  callback?.();
});

document.querySelectorAll('.connection-option').forEach(option => option.addEventListener('click', () => {
  document.querySelectorAll('.connection-option').forEach(item => item.classList.remove('selected'));
  option.classList.add('selected');
  document.querySelectorAll('.connection-option .check-icon').forEach(icon => icon.remove());
  const check = document.createElement('i');
  check.dataset.lucide = 'check'; check.className = 'check-icon'; option.appendChild(check); lucide.createIcons();
}));

document.getElementById('continue-modal').addEventListener('click', () => {
  const input = modalBackdrop.querySelector('input');
  if (authGenerated) { closeModal(); return; }
  const endpoint = input.value.trim();
  const match = endpoint.match(/^(?:(?:\d{1,3}\.){3}\d{1,3}|[a-z0-9.-]+):(\d{1,5})$/i);
  const port = match ? Number(match[1]) : 0;
  if (!match || port < 1 || port > 65535) { input.focus(); showToast('请输入有效的 IP 或域名，以及 1-65535 端口'); return; }
  const transport = modalBackdrop.querySelector('.connection-option.selected strong')?.textContent.trim() || 'HTTPS';
  const code = `PO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  primeOpsState.pendingHosts.push({ endpoint, transport, code, createdAt: Date.now() });
  document.getElementById('auth-code').textContent = code;
  document.getElementById('auth-result-copy').textContent = `${endpoint} · ${transport} 通道已创建，等待目标主机确认。`;
  document.getElementById('auth-result').hidden = false;
  document.getElementById('continue-modal').innerHTML = '完成<i data-lucide="check"></i>';
  lucide.createIcons();
  authGenerated = true;
  showToast(`一次性授权码已生成 · ${endpoint}`);
});

document.getElementById('open-ai-button').addEventListener('click', openAiDrawer);
document.querySelectorAll('[data-action="event-detail"]').forEach(item => item.addEventListener('click', () => showToast('事件详情已加入审计队列')));
document.getElementById('host-filter').addEventListener('click', () => showToast('筛选：全部状态 · 在线 12 · 需关注 2'));

function openAiDrawer() {
  const backdrop = document.getElementById('ai-drawer-backdrop');
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.getElementById('drawer-input')?.focus();
}

function closeAiDrawer() {
  const backdrop = document.getElementById('ai-drawer-backdrop');
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
}

document.getElementById('floating-ai-button').addEventListener('click', openAiDrawer);
document.getElementById('ai-drawer-close').addEventListener('click', closeAiDrawer);
document.getElementById('ai-drawer-backdrop').addEventListener('click', event => { if (event.target.id === 'ai-drawer-backdrop') closeAiDrawer(); });
document.getElementById('ai-drawer-settings').addEventListener('click', () => {
  closeAiDrawer();
  setSection('assistant');
  setTimeout(() => document.querySelector('#page-content [data-view-action="provider-settings"]')?.click(), 0);
});
document.getElementById('drawer-model-select').addEventListener('change', event => showToast(`已切换模型：${event.target.value}`));
document.getElementById('drawer-send').addEventListener('click', () => {
  const input = document.getElementById('drawer-input');
  const chat = document.getElementById('drawer-chat');
  if (!input.value.trim()) { input.focus(); showToast('请先输入想了解的主机问题'); return; }
  const message = document.createElement('div');
  message.className = 'drawer-message user';
  const prompt = input.value.trim();
  message.innerHTML = `<span class="drawer-message-avatar">YL</span><div><p>${escapeHtml(prompt)}</p></div>`;
  chat.appendChild(message);
  input.value = '';
  chat.scrollTop = chat.scrollHeight;
  showToast('消息已发送，AI 正在读取固定主机工具');
  appendDrawerAssistantReply(prompt);
});
document.getElementById('drawer-input').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); document.getElementById('drawer-send').click(); }
});

function appendDrawerAssistantReply(prompt, resultType = '') {
  const chat = document.getElementById('drawer-chat');
  const loading = document.createElement('div');
  loading.className = 'drawer-message assistant loading';
  loading.innerHTML = '<span class="drawer-message-icon"><i data-lucide="sparkles"></i></span><div><p>正在读取固定工具</p></div>';
  chat.appendChild(loading);
  lucide.createIcons();
  chat.scrollTop = chat.scrollHeight;
  window.setTimeout(() => {
    loading.remove();
    const lower = `${prompt} ${resultType}`.toLowerCase();
    let response = '当前主机整体状态正常。CPU 31%，内存 64%，磁盘 52%，暂未发现需要立即执行的高风险操作。';
    let tools = ['host.get_status', 'service.list'];
    if (lower.includes('磁盘') || lower.includes('disk')) { response = '磁盘使用率 52%，I/O 延迟稳定。hk-edge-02 的 /var 使用率为 91%，建议先检查 Docker 日志和旧镜像。'; tools = ['host.get_status', 'disk.get_usage', 'docker.list_containers']; }
    if (lower.includes('服务') || lower.includes('service')) { response = '已检查 42 个系统服务，当前没有失败服务。SSH 防御与 Docker Engine 均处于运行状态。'; tools = ['service.list', 'service.get_failures']; }
    const reply = document.createElement('div');
    reply.className = 'drawer-message assistant tool-result-message';
    reply.innerHTML = `<span class="drawer-message-icon"><i data-lucide="sparkles"></i></span><div><p>${escapeHtml(response)}</p><div class="drawer-tool-list">${tools.map(tool => `<span><i data-lucide="check"></i>${escapeHtml(tool)} · 已读取</span>`).join('')}</div><small><i data-lucide="lock"></i>只读结果，未执行写操作</small></div>`;
    chat.appendChild(reply);
    lucide.createIcons();
    chat.scrollTop = chat.scrollHeight;
  }, 650);
}

document.querySelectorAll('[data-drawer-action]').forEach(button => button.addEventListener('click', () => {
  const action = button.dataset.drawerAction;
  if (action === 'clear-chat') { document.getElementById('drawer-chat').innerHTML = '<div class="drawer-welcome"><span class="drawer-welcome-icon"><i data-lucide="message-circle"></i></span><h2>会话已清空</h2><p>可以重新发起主机诊断或输入一个运维问题。</p></div>'; lucide.createIcons(); showToast('当前会话已清空'); return; }
  const copy = { diagnose: '已创建当前主机诊断任务', 'disk-check': '正在读取磁盘使用率、I/O 和 Docker 日志', 'service-check': '正在读取系统服务状态与失败原因' };
  showToast(copy[action] || '诊断任务已创建');
  if (action !== 'clear-chat') appendDrawerAssistantReply(action === 'diagnose' ? '诊断当前主机' : action === 'disk-check' ? '检查磁盘' : '查看服务', action);
}));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeAiDrawer(); closeWriteConfirmation(); } });

lucide.createIcons();

document.querySelectorAll('button').forEach(button => button.addEventListener('pointerdown', () => {
  button.classList.remove('button-press');
  requestAnimationFrame(() => button.classList.add('button-press'));
}));

const bootScreen = document.getElementById('boot-screen');
const bootProgress = document.getElementById('boot-progress');
let bootValue = 0;
const bootTimer = setInterval(() => {
  bootValue = Math.min(9, bootValue + 1);
  bootProgress.textContent = bootValue;
  if (bootValue === 9) clearInterval(bootTimer);
}, 110);
setTimeout(() => bootScreen?.remove(), 1900);

// ---------- 真实数据接入 ----------

const primeOpsApi = {
  token: localStorage.getItem('primeops_token') || '',
  async request(path, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    if (this.token) headers['X-PrimeOps-Token'] = this.token;
    if (options.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(path, Object.assign({}, options, { headers }));
    if (response.status === 401) {
      const token = window.prompt('此面板已启用访问密钥保护，请输入访问密钥：');
      if (token) {
        this.token = token;
        localStorage.setItem('primeops_token', token);
        return this.request(path, options);
      }
      throw new Error('未授权');
    }
    return response;
  },
  async json(path, options) {
    const response = await this.request(path, options);
    return response.json();
  }
};
window.primeOpsApi = primeOpsApi;

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
  return `${value.toFixed(value >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分钟`;
}

function pad2(value) { return String(value).padStart(2, '0'); }

function chartPath(samples, key) {
  if (!samples || samples.length < 2) return null;
  const topPad = 15;
  const bottomPad = 195;
  const step = 720 / (samples.length - 1);
  let d = '';
  samples.forEach((sample, index) => {
    const value = Math.max(0, Math.min(100, sample[key] ?? 0));
    const x = (index * step).toFixed(1);
    const y = (bottomPad - (value / 100) * (bottomPad - topPad)).toFixed(1);
    d += `${index === 0 ? 'M' : 'L'}${x} ${y} `;
  });
  return d.trim();
}

function chartPoint(samples, key) {
  if (!samples || samples.length < 2) return null;
  const value = Math.max(0, Math.min(100, samples[samples.length - 1][key] ?? 0));
  return { x: 720, y: (195 - (value / 100) * 180).toFixed(1) };
}

async function applyRealOverview() {
  const page = document.getElementById('page-content');
  if (!page || !page.querySelector('.metric-grid')) return;
  let data;
  try {
    data = await primeOpsApi.json('/api/system');
  } catch {
    return;
  }

  const cards = page.querySelectorAll('.metric-card');
  if (cards[0]) {
    cards[0].querySelector('.metric-value').innerHTML = '1<span class="metric-muted">/ 1</span>';
    const pill = cards[0].querySelector('.status-pill');
    if (pill) pill.innerHTML = '<span class="pill-dot"></span>本机在线';
    const trend = cards[0].querySelector('.trend');
    if (trend) trend.innerHTML = `<i data-lucide="check"></i>${data.cpu.cores} 核`;
  }
  if (cards[1]) {
    cards[1].querySelector('.metric-value').innerHTML = `${data.cpu.percent}<span class="metric-unit">%</span>`;
    const pill = cards[1].querySelector('.status-pill');
    if (pill) pill.textContent = data.cpu.percent > 85 ? '高于警戒线' : '低于警戒线';
    const trend = cards[1].querySelector('.trend');
    if (trend) trend.textContent = data.loadavg[0] ? `负载 ${data.loadavg[0]}` : '实时';
  }
  if (cards[2]) {
    cards[2].querySelector('.metric-value').innerHTML = `${data.memory.percent}<span class="metric-unit">%</span>`;
    const pill = cards[2].querySelector('.status-pill');
    if (pill) pill.textContent = data.memory.percent > 90 ? '内存紧张' : '稳定';
    const trend = cards[2].querySelector('.trend');
    if (trend) trend.textContent = `${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}`;
  }
  if (cards[3]) {
    const label = cards[3].querySelector('.metric-top span');
    if (label) label.textContent = '磁盘使用率';
    const icon = cards[3].querySelector('.metric-top i, .metric-top svg');
    if (icon) icon.setAttribute('data-lucide', 'hard-drive');
    cards[3].querySelector('.metric-value').textContent = data.disk ? String(data.disk.percent).padStart(2, '0') : '—';
    const pill = cards[3].querySelector('.status-pill');
    if (pill) pill.textContent = data.disk ? `已用 ${formatBytes(data.disk.used)}` : '本机无 df 信息';
    const action = cards[3].querySelector('.inline-action');
    if (action) action.outerHTML = data.disk ? `<span class="mono" style="font-size:11px;color:#7d9c8f">${data.disk.mount}</span>` : '';
  }

  const notice = page.querySelector('.notice-copy span');
  if (notice) notice.textContent = '本机实时数据已连接 · CPU / 内存 / 磁盘 / Docker 真实读取';

  const eventsKicker = page.querySelector('.events-panel .panel-kicker');
  if (eventsKicker) eventsKicker.textContent = '事件流 · 待接入后端';

  page.querySelectorAll('.host-row').forEach(row => {
    if (row.dataset.host !== '本机') row.remove();
  });
  const localRow = page.querySelector('.host-row[data-host="本机"]');
  if (localRow) {
    const name = localRow.querySelector('.host-name strong + small, .host-name span small');
    if (name) name.textContent = data.hostname;
    const cells = localRow.children;
    if (cells[1]) {
      const region = cells[1].querySelector('.region');
      const ip = cells[1].querySelector('.mono');
      if (region) region.textContent = '本机';
      if (ip) ip.textContent = data.ip;
    }
    const meters = [
      [cells[2], data.cpu.percent],
      [cells[3], data.memory.percent],
      [cells[4], data.disk ? data.disk.percent : null]
    ];
    meters.forEach(([cell, percent]) => {
      if (!cell) return;
      const bar = cell.querySelector('.mini-meter span');
      const number = cell.querySelector('.table-number');
      if (bar && percent !== null) bar.style.width = `${percent}%`;
      if (number) {
        number.textContent = percent === null ? '—' : `${percent}%`;
        number.classList.toggle('danger-text', percent !== null && percent > 85);
      }
      const meter = cell.querySelector('.mini-meter');
      if (meter) meter.classList.toggle('danger', percent !== null && percent > 85);
    });
  }
  const footer = page.querySelector('.table-footer span');
  if (footer) footer.textContent = '本机节点 · 实时数据';

  const clusterBadge = document.querySelector('.nav-item[data-section="cluster"] .nav-count');
  if (clusterBadge) clusterBadge.textContent = '1';

  try {
    const history = await primeOpsApi.json('/api/history');
    const samples = history.samples || [];
    const cpuLine = chartPath(samples, 'cpu');
    const memLine = chartPath(samples, 'mem');
    if (cpuLine && memLine) {
      const setCpu = page.querySelector('.chart-line-cpu');
      const setMem = page.querySelector('.chart-line-memory');
      const setFill = page.querySelector('.chart-fill-memory');
      if (setCpu) setCpu.setAttribute('d', cpuLine);
      if (setMem) setMem.setAttribute('d', memLine);
      if (setFill) setFill.setAttribute('d', `${memLine} L720 210 L0 210 Z`);
      const points = page.querySelectorAll('.chart-point');
      const cpuPoint = chartPoint(samples, 'cpu');
      const memPoint = chartPoint(samples, 'mem');
      if (points[0] && memPoint) { points[0].setAttribute('cx', memPoint.x); points[0].setAttribute('cy', memPoint.y); }
      if (points[1] && cpuPoint) { points[1].setAttribute('cx', cpuPoint.x); points[1].setAttribute('cy', cpuPoint.y); }
      const axis = page.querySelectorAll('.x-axis span');
      const pick = ratio => samples[Math.min(samples.length - 1, Math.floor(ratio * (samples.length - 1)))];
      const ratios = [0, 0.25, 0.5, 0.75, 1];
      axis.forEach((span, index) => {
        const sample = pick(ratios[index]);
        if (!sample) return;
        const date = new Date(sample.t);
        span.textContent = index === ratios.length - 1 ? '现在' : `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
      });
      const note = page.querySelector('.chart-note');
      if (note) note.innerHTML = `<i data-lucide="clock-3"></i>每 30 秒采样 · 已采集 ${samples.length} 个点`;
    }
  } catch { /* 图表保持默认 */ }

  try {
    const docker = await primeOpsApi.json('/api/docker/containers');
    const badge = document.querySelector('.nav-item[data-section="containers"] .nav-count');
    if (badge) {
      if (docker.available) {
        badge.style.display = '';
        badge.textContent = String(docker.containers.length);
      } else {
        badge.style.display = 'none';
      }
    }
  } catch { /* 忽略 */ }

  lucide.createIcons();
}
window.applyRealOverview = applyRealOverview;

// 初次加载立即拉取真实数据覆盖静态演示值
applyRealOverview();

setInterval(() => {
  const clock = document.querySelector('.sync-status .mono');
  if (!clock) return;
  const now = new Date();
  clock.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}, 1000);
