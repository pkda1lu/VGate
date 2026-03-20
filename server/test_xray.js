const cp = require("child_process");
const fs = require("fs");
const xInbound = {
  tag: "test",
  port: 443,
  protocol: "vless",
  settings: {
    clients: [{ id: "bc3aa2a1-fa44-4af3-bc7c-7d9a8c1f3ef4", flow: "xtls-rprx-vision" }],
    decryption: "none",
    fallbacks: []
  },
  streamSettings: {
    network: "tcp",
    security: "reality",
    realitySettings: {
      show: false,
      dest: "google.com:443",
      xver: 0,
      serverNames: ["google.com"],
      privateKey: "yGfC3fcnwe-ue324J_s9VGHyNrrIKdxhBWI3tUOBfm0",
      shortIds: ["a1b2c3d4"],
      spiderX: "/"
    }
  },
  sniffing: { enabled: true, destOverride: ["http", "tls"] }
};

const config = {
  inbounds: [xInbound],
  outbounds: [{protocol: 'freedom', tag: 'direct'}]
};

fs.writeFileSync("dummy.json", JSON.stringify(config));
try {
  const result = cp.execSync(".\\xray.exe test -c dummy.json").toString();
  console.log("Xray Test Output:");
  console.log(result);
} catch(e) {
  console.log("Xray Test Failed:");
  console.log(e.stdout ? e.stdout.toString() : e.message);
  console.log(e.stderr ? e.stderr.toString() : '');
}
