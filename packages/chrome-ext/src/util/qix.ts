import enigma from 'enigma.js';
import schema from 'enigma.js/schemas/12.2015.0.json';

interface QixOptions {
  host: string;
  virtualProxy?: string;
  secure?: boolean;
  appId?: string;
}

function buildEngineUrl({ host, virtualProxy, secure = true }: QixOptions): string {
  const scheme = secure ? 'wss' : 'ws';
  const virtualProxyPath = virtualProxy ? `/${virtualProxy}` : '';
  const params = new URLSearchParams();

  const qs = params.toString();
  return `${scheme}://${host}${virtualProxyPath}/app/engineData${qs ? `?${qs}` : ''}`;
}

export class QixConnection {
  private _options: QixOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _session: any | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _global: any | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _app: any | null = null;

  constructor(options: QixOptions) {
    this._options = options;
  }

  get options() {
    return this._options;
  }

  get url() {
    return buildEngineUrl(this.options);
  }

  get app() {
    return this._app;
  }

  async open() {
    if (this._global) {
      return this._global;
    }

    this._session = enigma.create({
      schema,
      url: buildEngineUrl(this.options),
      createSocket: (url) => new WebSocket(url),
    });

    this._session.on('closed', () => {
      this._global = null;
      this._session = null;
      this._app = null;
    });

    this._global = await this._session.open();

    if (this._options.appId) {
      this._app = await this._global.openDoc(this._options.appId);
    }

    return this._global;
  }

  async close() {
    if (!this._session) {
      return;
    }

    await this._session.close().catch(() => {});

    this._global = null;
    this._session = null;
    this._app = null;
  }

  isConnected() {
    return !!this._global;
  }
}

/**
 * Extracts the virtual proxy prefix from a Qlik Sense data load editor URL.
 *
 * Assumes the extension only runs on data load editor pages (guaranteed by the
 * activation guard), so the path always contains a `dataloadeditor` segment.
 */
function deriveVirtualProxy(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const index = segments.indexOf('dataloadeditor');

  return index > 0 ? segments[index - 1] : '';
}

/**
 * Extracts the app id from a Qlik Sense data load editor URL.
 *
 * Assumes the extension only runs on data load editor pages (guaranteed by the
 * activation guard), so the path always matches `/<vproxy>/dataloadeditor/app/<appId>`.
 */
function deriveAppId(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  const index = segments.indexOf('dataloadeditor');

  if (index < 0 || segments[index + 1] !== 'app' || index + 2 >= segments.length) {
    return undefined;
  }

  return decodeURIComponent(segments[index + 2]);
}

/**
 * Derives the connection from the current tab and the existing Qlik session.
 *
 * Assumes the extension only runs on data load editor pages (guaranteed by the
 * activation guard), so the path always contains a `dataloadeditor` segment.
 */
export function deriveQixConnection(): QixConnection {
  const virtualProxy = deriveVirtualProxy(location.pathname);
  const appId = deriveAppId(location.pathname);

  return new QixConnection({
    virtualProxy,
    host: location.host,
    secure: location.protocol === 'https:',
    appId,
  });
}
