const title = document.getElementById('options-title') as HTMLHeadingElement;
const subtitle = document.getElementById('options-subtitle') as HTMLParagraphElement;
const placeholder = document.getElementById('options-placeholder') as HTMLParagraphElement;

const localizedTitle = chrome.i18n.getMessage('optionsTitle');

document.title = localizedTitle;
document.documentElement.lang = chrome.i18n.getUILanguage();

title.textContent = localizedTitle;
subtitle.textContent = chrome.i18n.getMessage('optionsSubtitle');
placeholder.textContent = chrome.i18n.getMessage('optionsPlaceholder');
