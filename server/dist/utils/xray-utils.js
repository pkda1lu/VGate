"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShortId = exports.generateRealityKeys = exports.generateUuid = void 0;
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const generateUuid = () => (0, uuid_1.v4)();
exports.generateUuid = generateUuid;
const generateRealityKeys = () => {
    try {
        const xrayBinary = process.platform === 'win32' ? 'xray.exe' : 'xray';
        const output = (0, child_process_1.execSync)(`${xrayBinary} x25519`).toString().trim();
        // Expected: 
        // Private key: <key>
        // Public key: <key>
        const lines = output.split('\n');
        const privateKey = lines[0].split(': ')[1].trim();
        const publicKey = lines[1].split(': ')[1].trim();
        return { privateKey, publicKey };
    }
    catch (err) {
        console.warn('Could not generate X25519 keys via Xray binary. Using mockup keys for dev.');
        return {
            privateKey: 'YOUR_PRIVATE_KEY_HERE',
            publicKey: 'YOUR_PUBLIC_KEY_HERE'
        };
    }
};
exports.generateRealityKeys = generateRealityKeys;
const generateShortId = (length = 8) => {
    return Math.random().toString(16).substring(2, 2 + length);
};
exports.generateShortId = generateShortId;
