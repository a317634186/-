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
