import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

export const generateUuid = () => uuidv4();

export const generateRealityKeys = () => {
  try {
    const xrayBinary = process.platform === 'win32' ? 'xray.exe' : 'xray';
    const output = execSync(`${xrayBinary} x25519`).toString().trim();
    // Expected: 
    // Private key: <key>
    // Public key: <key>
    const lines = output.split('\n');
    const privateKey = lines[0].split(': ')[1].trim();
    const publicKey = lines[1].split(': ')[1].trim();
    return { privateKey, publicKey };
  } catch (err) {
    console.warn('Could not generate X25519 keys via Xray binary. Using mockup keys for dev.');
    return {
      privateKey: 'YOUR_PRIVATE_KEY_HERE',
      publicKey: 'YOUR_PUBLIC_KEY_HERE'
    };
  }
};

export const generateShortId = (length = 8) => {
  return Math.random().toString(16).substring(2, 2 + length);
};
