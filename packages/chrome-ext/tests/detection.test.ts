import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifyPage,
  couldBeQSE,
  couldBeScriptEditor,
  isQlikScriptEditor,
  urlLooksLikeScriptEditor,
} from '../src/util/detection.js';

/** Stubs the page path the detection helpers read from `location`. */
function setPath(pathname: string): void {
  vi.stubGlobal('location', { pathname });
}

function mountQlikSense(): void {
  const root = document.createElement('div');
  root.id = 'qv-page-container';
  document.body.append(root);
}

function mountScriptEditor(): void {
  const editor = document.createElement('div');
  editor.setAttribute('data-testid', 'script-editor-container');
  document.body.append(editor);
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('couldBeQSE', () => {
  it('is false on a page without the Sense root container', () => {
    expect(couldBeQSE()).toBe(false);
  });

  it('is true once the Sense root container is present', () => {
    mountQlikSense();
    expect(couldBeQSE()).toBe(true);
  });
});

describe('urlLooksLikeScriptEditor', () => {
  it('matches the data load editor path', () => {
    setPath('/sense/app/abc/dataloadeditor/');
    expect(urlLooksLikeScriptEditor()).toBe(true);
  });

  it('ignores case, since Sense does not normalize the path', () => {
    setPath('/sense/app/abc/DataLoadEditor/');
    expect(urlLooksLikeScriptEditor()).toBe(true);
  });

  it('does not match other Sense pages', () => {
    setPath('/sense/app/abc/sheet/xyz');
    expect(urlLooksLikeScriptEditor()).toBe(false);
  });
});

describe('couldBeScriptEditor', () => {
  it('is false before the editor container is mounted', () => {
    expect(couldBeScriptEditor()).toBe(false);
  });

  it('is true once the editor container is mounted', () => {
    mountScriptEditor();
    expect(couldBeScriptEditor()).toBe(true);
  });
});

describe('isQlikScriptEditor', () => {
  it('requires all three signals', () => {
    mountQlikSense();
    mountScriptEditor();
    setPath('/sense/app/abc/dataloadeditor/');

    expect(isQlikScriptEditor()).toBe(true);
  });

  it('is false on a Sense page that is not the editor', () => {
    mountQlikSense();
    setPath('/sense/app/abc/sheet/xyz');

    expect(isQlikScriptEditor()).toBe(false);
  });

  it('is false on a foreign page that happens to use the editor path', () => {
    mountScriptEditor();
    setPath('/dataloadeditor/');

    expect(isQlikScriptEditor()).toBe(false);
  });
});

describe('classifyPage', () => {
  it('reports the missing Sense root first', () => {
    setPath('/dataloadeditor/');
    expect(classifyPage()).toMatch(/qv-page-container missing/);
  });

  it('reports a non-matching url once the root is there', () => {
    mountQlikSense();
    setPath('/sense/app/abc/sheet/xyz');

    expect(classifyPage()).toMatch(/url not matching/);
  });

  it('reports the editor as not yet mounted when only the DOM is missing', () => {
    mountQlikSense();
    setPath('/sense/app/abc/dataloadeditor/');

    expect(classifyPage()).toMatch(/dom not mounted yet/);
  });

  it('reports detection on a fully loaded editor', () => {
    mountQlikSense();
    mountScriptEditor();
    setPath('/sense/app/abc/dataloadeditor/');

    expect(classifyPage()).toBe('qse detected');
  });
});
