import type { GetPhaseMessage, Message, Phase, PhaseMessage } from './types.js';

type View = 'unknown' | 'unsupported' | 'not-granted' | Phase;

const dot = document.getElementById('dot') as HTMLSpanElement;
const label = document.getElementById('label') as HTMLSpanElement;
const grant = document.getElementById('grant') as HTMLButtonElement;

const MESSAGE_KEYS: Record<View, string> = {
  unknown: 'statusLoading',
  unsupported: 'statusUnsupported',
  'not-granted': 'statusNotGranted',
  active: 'statusActive',
  inactive: 'statusInactive',
};

function render(view: View): void {
  label.textContent = chrome.i18n.getMessage(MESSAGE_KEYS[view]);
  dot.classList.toggle('active', view === 'active');
  dot.classList.toggle('inactive', view === 'inactive');
  grant.hidden = view !== 'not-granted';
}

grant.textContent = chrome.i18n.getMessage('grantButton');
render('unknown');

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

async function queryPhase(tabId: number): Promise<Phase | 'unknown'> {
  try {
    const request: GetPhaseMessage = { type: 'qlint:get-phase' };
    const response = (await chrome.tabs.sendMessage(tabId, request)) as PhaseMessage | undefined;
    return response?.phase ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

async function refresh(): Promise<void> {
  const tab = await getActiveTab();

  if (!tab?.id || !tab.url) {
    render('unknown');
    return;
  }

  const origin = originPattern(tab.url);

  if (!origin) {
    render('unsupported');
    return;
  }

  if (!(await isOriginGranted(origin))) {
    render('not-granted');
    grant.onclick = () => {
      chrome.permissions
        .request({ origins: [origin] })
        .then((ok) => {
          if (ok) {
            void refresh();
          }
        })
        .catch((err) => {
          console.warn('[qlint popup] permission request failed', err);
        });
    };
    return;
  }

  const phase = await queryPhase(tab.id);
  render(phase);
}

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message?.type === 'qlint:phase') {
    render(message.phase);
  }
});

void refresh();
