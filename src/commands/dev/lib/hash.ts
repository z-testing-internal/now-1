import fs from 'fs';
import crypto from 'crypto';

export default async function (fsPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha1');
      const fileStream = fs.createReadStream(fsPath);

      fileStream.on('readable', () => {
        const data = fileStream.read();
        if (data) {
          hash.update(data);
        } else {
          resolve(hash.digest('hex'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
