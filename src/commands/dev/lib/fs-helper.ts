/**
 * Virtual FS Utils
 */

import fs from 'fs';
import path from 'path';
import hash from './hash';

export async function verifyFile (cwd: string, file: string, sha1: string): Promise<boolean> {
  const dest = path.join(cwd, file);

  if (!fs.existsSync(dest)) return false;
  if (!fs.lstatSync(dest).isFile()) return false;
  if (!(await hash(dest) === sha1)) return false;

  return true;
}

export async function readFileBase64 (cwd: string, file: string): Promise<string> {
  const dest = path.join(cwd, file);

  return new Promise((resolve, reject) => {
    fs.readFile(dest, { encoding: 'base64' }, (error, base64) => {
      if (error) return reject(error);

      resolve(base64);
    });
  });
}

export async function writeFileBase64 (cwd: string, file: string, base64: string): Promise<void> {
  const dest = path.join(cwd, file);

  return new Promise((resolve, reject) => {
    fs.writeFile(dest, base64, { encoding: 'base64' }, error => {
      if (error) return reject(error);

      resolve();
    });
  });
}
