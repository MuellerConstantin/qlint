import type { LocationChangeMessage } from './types.js';

const CONTENT_SCRIPT_ID = 'qlint-content';

async function syncContentScripts(): Promise<void> {
  const granted = await chrome.permissions.getAll();
  const origins = granted.origins ?? [];

  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [CONTENT_SCRIPT_ID],
  });

  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  }

  if (origins.length === 0) {
    console.log('[qlint] no granted origins — content script unregistered');
    return;
  }

  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      matches: origins,
      js: ['content.js'],
      runAt: 'document_idle',
    },
  ]);

  console.log('[qlint] content script registered for', origins);
}

chrome.action.onClicked.addListener(async (tab) => {
  console.log('[qlint] action clicked', { tabId: tab.id, url: tab.url });

  if (!tab.url) {
    console.warn('[qlint] no tab.url — activeTab permission missing or chrome:// URL');
    return;
  }

  let origin: string;

  try {
    origin = `${new URL(tab.url).origin}/*`;
  } catch {
    console.warn('[qlint] cannot derive origin from', tab.url);
    return;
  }

  const granted = await chrome.permissions.request({ origins: [origin] });
  console.log('[qlint] permission request', { origin, granted });
});

chrome.permissions.onAdded.addListener(() => {
  void syncContentScripts();
});

chrome.permissions.onRemoved.addListener(() => {
  void syncContentScripts();
});

chrome.runtime.onInstalled.addListener(() => {
  void syncContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  void syncContentScripts();
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }

  const message: LocationChangeMessage = { type: 'qlint:locationchange' };
  chrome.tabs.sendMessage(details.tabId, message).catch(() => {});
});

console.log('[qlint] service worker booted');
