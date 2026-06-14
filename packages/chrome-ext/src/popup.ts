import type {
  DiagnosticCounts,
  DiagnosticsMessage,
  FixAllMessage,
  GetDiagnosticsMessage,
  GetStatusMessage,
  Message,
  Status,
  StatusMessage,
} from './types.js';

const statusDot = document.getElementById('status-dot') as HTMLSpanElement;
const statusLabel = document.getElementById('status-label') as HTMLSpanElement;
const grantButton = document.getElementById('grant-button') as HTMLButtonElement;
const fixAllButton = document.getElementById('fix-all-button') as HTMLButtonElement;

const summary = document.getElementById('summary') as HTMLDivElement;
const countError = document.getElementById('count-error') as HTMLSpanElement;
const countWarning = document.getElementById('count-warning') as HTMLSpanElement;
const countInfo = document.getElementById('count-info') as HTMLSpanElement;

const STATUS_MESSAGE_KEYS: Record<Status, string> = {
  loading: 'statusLoading',
  unsupported: 'statusUnsupported',
  'not-granted': 'statusNotGranted',
  active: 'statusActive',
  inactive: 'statusInactive',
  errored: 'statusErrored',
};

let activeTabId: number | null = null;

function renderStatus(status: Status): void {
  statusLabel.textContent = chrome.i18n.getMessage(STATUS_MESSAGE_KEYS[status]);

  statusDot.classList.toggle('active', status === 'active');
  statusDot.classList.toggle('inactive', status === 'inactive');

  grantButton.hidden = status !== 'not-granted';

  if (status !== 'active') {
    fixAllButton.hidden = true;
  }
}

function renderCounts(counts: DiagnosticCounts | undefined, fixable: number): void {
  summary.hidden = !counts;
  fixAllButton.hidden = !counts || fixable <= 0;

  if (!counts) {
    return;
  }

  countError.textContent = String(counts.error);
  countWarning.textContent = String(counts.warning);
  countInfo.textContent = String(counts.info);
}

grantButton.textContent = chrome.i18n.getMessage('grantButton');
fixAllButton.textContent = chrome.i18n.getMessage('fixAllButton');
fixAllButton.onclick = () => {
  if (activeTabId === null) {
    return;
  }
  const request: FixAllMessage = { type: 'qlint:fix-all' };
  chrome.tabs.sendMessage(activeTabId, request).catch(() => {});
};
renderStatus('loading');

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function originPattern(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return null;
    }

    return `${u.protocol}//${u.hostname}/*`;
  } catch {
    return null;
  }
}

async function isOriginGranted(origin: string): Promise<boolean> {
  const granted = await chrome.permissions.getAll();
  return (granted.origins ?? []).includes(origin);
}

async function queryStatus(tabId: number): Promise<Status> {
  try {
    const request: GetStatusMessage = { type: 'qlint:get-status' };
    const response = (await chrome.tabs.sendMessage(tabId, request)) as StatusMessage | undefined;
    return response?.status ?? 'errored';
  } catch {
    return 'errored';
  }
}

async function queryDiagnostics(tabId: number): Promise<DiagnosticsMessage | null> {
  try {
    const request: GetDiagnosticsMessage = { type: 'qlint:get-diagnostics' };
    const response = (await chrome.tabs.sendMessage(tabId, request)) as DiagnosticsMessage | undefined;
    return response ?? null;
  } catch {
    return null;
  }
}

async function refresh(): Promise<void> {
  const tab = await getActiveTab();
  activeTabId = tab?.id ?? null;

  if (!tab?.id || !tab.url) {
    renderStatus('unsupported');
    return;
  }

  const origin = originPattern(tab.url);

  if (!origin) {
    renderStatus('unsupported');
    return;
  }

  if (!(await isOriginGranted(origin))) {
    renderStatus('not-granted');

    grantButton.onclick = () => {
      chrome.permissions
        .request({ origins: [origin] })
        .then((ok) => {
          if (ok) {
            void refresh();
          }
        })
        .catch((err) => {
          console.warn('[qlint:popup] permission request failed', err);
        });
    };
    return;
  }

  const status = await queryStatus(tab.id);
  renderStatus(status);

  if (status === 'active') {
    const diagnostics = await queryDiagnostics(tab.id);
    renderCounts(diagnostics?.counts, diagnostics?.fixable ?? 0);
  } else {
    renderCounts(undefined, 0);
  }
}

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message?.type === 'qlint:status') {
    renderStatus(message.status);

    if (message.status !== 'active') {
      renderCounts(undefined, 0);
    }
  }

  if (message?.type === 'qlint:diagnostics') {
    renderCounts(message.counts, message.fixable);
  }
});

void refresh();
