# Permissions

Why the extension asks for each permission, what it does with it, and what breaks without it. Every entry
points at the code that uses it, so the rationale can be checked rather than believed. For what happens to
your data, see the [privacy policy](../../../docs/PRIVACY.md).

## Single purpose

qlint lints and formats Qlik load scripts. In the browser, that means one thing: detecting the Qlik Sense
Data Load Editor on a page you have explicitly enabled, reading the script out of its editor, and rendering
diagnostics — or a formatted version — back into it. Every permission below exists to serve that.

## Design: nothing is granted at install

The extension declares **no** host permissions in its manifest — `<all_urls>` appears only under
`optional_host_permissions`, which grants nothing on its own. A fresh install can read no page anywhere.
You grant a single origin at a time through the "Enable qlint for this page" button in the popup, and the
extension registers its content scripts for exactly the origins you granted
([`src/background.ts`](../src/background.ts)). Revoking access unregisters them again on the spot.

## Requested permissions

| Permission                                 | Used for                                                              | Code                                          |
| ------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------- |
| `storage`                                  | Persisting your lint configuration (presets, per-rule severities)     | [`src/util/config.ts`](../src/util/config.ts) |
| `scripting`                                | Registering and injecting the content scripts for origins you granted | [`src/background.ts`](../src/background.ts)   |
| `webNavigation`                            | Noticing in-app route changes in Qlik Sense so detection re-runs      | [`src/background.ts`](../src/background.ts)   |
| `activeTab`                                | Letting the popup act on the tab you opened it over                   | [`src/popup.ts`](../src/popup.ts)             |
| `optional_host_permissions` (`<all_urls>`) | Access to the one Qlik Sense origin you enable, requested at runtime  | [`src/popup.ts`](../src/popup.ts)             |

### `storage`

Your configuration — preset names and per-rule severities and options — is written to a single `config` key
in `chrome.storage.sync`, so it follows you across your signed-in Chrome profiles. No script content and no
personal data is ever stored. Without it, every rule choice would reset on each page load.

### `scripting`

The extension has no static `content_scripts` block. Instead, the service worker registers its two scripts
(`content.js`, and `main.js` in the page's MAIN world, which is where the editor's CodeMirror instance
lives) for precisely the origins you have granted, and re-registers them when that set changes. It also
injects them once into already-open tabs on the origin you just enabled, so enabling works without a
reload. Without it, there is no way to reach the editor at all.

### `webNavigation`

Qlik Sense is a single-page application: moving from the Hub into the Data Load Editor changes the URL
without a page load, so a content script alone never learns that the editor now exists. The extension
listens to `onHistoryStateUpdated` for the top-level frame only, and uses it purely as a signal to re-run
detection in that tab. No navigation data is stored, aggregated, or read for any other purpose — the
listener forwards a bare `qlint:location-change` message with no payload. Without it, qlint would appear
dead until you hard-reloaded the editor.

### `activeTab`

The popup needs the current tab's URL to derive the origin it should offer to enable, and its id to ask the
content script for the current diagnostic counts. `activeTab` grants that only for the tab you opened the
popup over, and only because you opened it.

### `optional_host_permissions: <all_urls>`

This is the broadest declaration in the manifest and the one that deserves the most explanation.

Qlik Sense Enterprise on Windows is **self-hosted**. Every customer runs it on their own internal
hostname — `qlik.acme-corp.internal`, `bi-prod.example.org`, an IP, a non-standard port. There is no
vendor-controlled domain to match against, so no fixed pattern in the manifest could ever cover the
installations this extension exists for.

What that declaration does _not_ do is grant access. Concretely:

- At install, the extension holds **zero** host permissions and can read no page.
- Access is requested via `chrome.permissions.request()` for **one origin at a time**, derived from the tab
  you are looking at (`https://host/*`), triggered by your click on "Enable qlint for this page". Chrome
  shows its own consent prompt for that specific site.
- Content scripts are registered for granted origins only, and are unregistered the moment you revoke.
- Revocation is available at any time under `chrome://extensions` → qlint → Site access.

The result is the narrowest access the deployment model allows: you end up with qlint enabled on your own
Qlik server and nowhere else.
