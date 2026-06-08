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

chrome.permissions.onAdded.addListener((perms) => {
  void handlePermissionsAdded(perms);
});

async function handlePermissionsAdded(perms: chrome.permissions.Permissions): Promise<void> {
  await syncContentScripts();

  const origins = perms.origins ?? [];

  if (origins.length === 0) {
    return;
  }

  const tabs = await chrome.tabs.query({ url: origins });

  await Promise.all(
    tabs.map(async (tab) => {
      if (typeof tab.id !== 'number') {
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
      } catch (err) {
        console.warn('[qlint] failed to inject content script into tab', tab.id, err);
      }
    }),
  );
}

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

  const message: LocationChangeMessage = { type: 'qlint:location-change' };
  chrome.tabs.sendMessage(details.tabId, message).catch(() => {});
});

console.log('[qlint] service worker booted');
