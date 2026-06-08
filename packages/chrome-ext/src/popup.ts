import type { GetStatusMessage, Message, Status, StatusMessage } from './types.js';

const statusDot = document.getElementById('status-dot') as HTMLSpanElement;
const statusLabel = document.getElementById('status-label') as HTMLSpanElement;
const grantButton = document.getElementById('grant-button') as HTMLButtonElement;

const STATUS_MESSAGE_KEYS: Record<Status, string> = {
  loading: 'statusLoading',
  unsupported: 'statusUnsupported',
  'not-granted': 'statusNotGranted',
  active: 'statusActive',
  inactive: 'statusInactive',
  errored: 'statusErrored',
};

function renderStatus(status: Status): void {
  statusLabel.textContent = chrome.i18n.getMessage(STATUS_MESSAGE_KEYS[status]);

  statusDot.classList.toggle('active', status === 'active');
  statusDot.classList.toggle('inactive', status === 'inactive');

  grantButton.hidden = status !== 'not-granted';
}

grantButton.textContent = chrome.i18n.getMessage('grantButton');
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

async function refresh(): Promise<void> {
  const tab = await getActiveTab();

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

    grantButton.onclick = async () => {
      try {
        const ok = await chrome.permissions.request({ origins: [origin] });

        if (!ok) {
          return;
        }

        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          files: ['content.js'],
        });

        void refresh();
      } catch (err) {
        console.warn('[qlint popup] permission request failed', err);
      }
    };
    return;
  }

  const status = await queryStatus(tab.id);
  renderStatus(status);
}

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message?.type === 'qlint:status') {
    renderStatus(message.status);
  }
});

void refresh();
