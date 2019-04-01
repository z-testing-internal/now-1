import path from 'path';
import chokidar from 'chokidar';
import WebSocket from 'ws';

import hash from './hash';
import { readFileBase64 } from './fs-helper';
import { Output } from '../../../util/output';
import IGNORED from '../../../util/ignored';

export enum ServerEvent {
  MISSING_FILE = 'MISSING_FILE'
}

export enum ClientEvent {
  FS_CHANGE = 'FS_CHANGE',
  UPDATE_FILE = 'UPDATE_FILE'
}

interface WebSocketError extends Error {
  code?: string;
}

interface DevWatcherOptions {
  debug: boolean;
  output: Output;
}

export default class DevWatcher {
  private cwd: string;
  private output: Output;
  private remote?: string;
  private devSocket?: WebSocket;
  private fsWatcher?: chokidar.FSWatcher;
  private reconnTimeout?: NodeJS.Timer;

  constructor (cwd: string, options: DevWatcherOptions) {
    this.cwd = cwd;
    this.output = options.output;
    this.connect();

    process.once('SIGINT', this.stop);
  }

  private connect = async () => {
    this.remote = this.spinDevWorker();

    this.output.debug(`CONNECT ${new Date}`);

    const wss = new WebSocket(this.remote);
    wss.on('open', this.onWebsocketOpen);
    wss.on('message', this.onWebsocketMessage);
    wss.on('error', this.onWebsocketError);

    this.devSocket = wss;
  }

  spinDevWorker = (): string => {
    this.output.debug('TODO: spin dev-worker');
    return 'http://localhost:3000'
  }

  private onWebsocketOpen = () => {
    this.fsWatcher = this.startWatcher();
  }

  private startWatcher = () => {
    const watcher = chokidar.watch(this.cwd, {
      ignored: IGNORED
    });
    watcher.on('add', this.onFsChange('add'));
    watcher.on('change', this.onFsChange('change'));
    watcher.on('unlink', this.onFsChange('unlink'));

    return watcher;
  }

  private onWebsocketMessage = async (message: string) => {
    const [event, data] = JSON.parse(message);
    switch (event) {
      case ServerEvent.MISSING_FILE:
        return this.sendFile(data.file);
      default:
        this.output.log(`WS_MSG ${event} ${data}`);
    }
  }

  private sendFile = async (file: string) => {
    const base64 = await readFileBase64(this.cwd, file);
    this.emit(ClientEvent.UPDATE_FILE, { file, base64 });
  }

  private onWebsocketError = (err: WebSocketError) => {
    switch (err.code) {
      case 'ECONNREFUSED':
        this.reconnTimeout = setTimeout(this.connect, 1000);
        return;
      default:
        this.output.debug(`WS_ERR ${err}`);
    }
  }

  private onFsChange = (event: string) => async (_path: string) => {
    let sha1;

    if (event !== 'unlink') {
      sha1 = await hash(_path);
    }

    const file = path.relative(this.cwd, _path);
    const data = { event, file, sha1 };

    console.log(ClientEvent.FS_CHANGE, event, file);
    this.emit(ClientEvent.FS_CHANGE, data);
  };

  private emit = (event: string, data: object) => {
    if (!this.devSocket) return;

    const message = JSON.stringify([event, data]);
    return this.devSocket.send(message, err => {
      if (err) {
        console.error(err, event, data);
      }
    });
  }

  public stop = () => {
    if (this.fsWatcher) this.fsWatcher.close();
    if (this.devSocket) this.devSocket.close(1000);
    if (this.reconnTimeout) clearTimeout(this.reconnTimeout);
  }
}
