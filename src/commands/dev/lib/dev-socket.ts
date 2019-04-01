import WebSocket from 'ws';

export default class DevSocket {
  private remote: string;
  private ws?: WebSocket;

  constructor (remote: string) {
    this.remote = remote;
  }

  connect = async (): Promise<DevSocket> => {
    const devSocket = this;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.remote);

      ws.on('open', () => resolve(devSocket));
      ws.on('error', reject);
      ws.on('close', this.onClose);
      ws.on('message', this.onMessage);

      this.ws = ws;
    });
  }

  onClose = () => {
    console.log('ws closed');
  }

  onMessage = (data: WebSocket.Data) => {
    console.log(data);
  }
}
