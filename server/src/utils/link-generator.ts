export function safeBase64(str: string) {
    try {
        return Buffer.from(str).toString('base64');
    } catch (e) {
        return str;
    }
}

export function generateProxyUri(inbound: any, client: any, host: string) {
    const port = inbound.port;
    const uuid = client.uuid;
    const tag = encodeURIComponent(client.email);
    
    let stream;
    try { 
        stream = typeof inbound.stream === 'string' ? JSON.parse(inbound.stream) : inbound.stream; 
    } catch(e) { 
        stream = {}; 
    }

    const security = stream.security || 'none';
    const type = stream.network || 'tcp';

    if (inbound.protocol === 'vless' || inbound.protocol === 'trojan') {
        let url = `${inbound.protocol}://${uuid}@${host}:${port}?type=${type}&security=${security}&encryption=none`;

        if (type === 'xhttp') {
            const xpath = stream.xhttpSettings?.path || '/';
            const xhost = stream.xhttpSettings?.host || '';
            const xmode = stream.xhttpSettings?.mode || 'auto';
            url += `&path=${encodeURIComponent(xpath)}&mode=${xmode}`;
            if (xhost) url += `&host=${encodeURIComponent(xhost)}`;
        } else if (type === 'ws') {
            url += `&path=${encodeURIComponent(stream.wsSettings?.path || '/')}&host=${encodeURIComponent(stream.wsSettings?.headers?.Host || '')}`;
        } else if (type === 'grpc') {
            url += `&serviceName=${encodeURIComponent(stream.grpcSettings?.serviceName || '')}`;
        }

        if (security === 'reality') {
            const pbk = stream.realitySettings?.publicKey || '';
            const sni = stream.realitySettings?.serverNames?.[0] || '';
            const sid = stream.realitySettings?.shortIds?.[0] || '';
            const spx = stream.realitySettings?.spiderX || '/';
            const fp = 'chrome';
            const flow = client.flow && client.flow !== 'none' ? client.flow : (inbound.protocol === 'vless' ? 'xtls-rprx-vision' : '');
            url += `&pbk=${pbk}&sni=${sni}&fp=${fp}&sid=${sid}&spx=${encodeURIComponent(spx)}`;
            if (flow) url += `&flow=${flow}`;
        } else if (security === 'tls') {
            const sni = stream.tlsSettings?.serverName || host;
            url += `&sni=${sni}`;
        }

        url += `#${tag}`;
        return url;
    }

    if (inbound.protocol === 'vmess') {
        const vmessObj = {
            v: "2",
            ps: client.email,
            add: host,
            port: port,
            id: uuid,
            aid: "0",
            scy: "auto",
            net: type,
            type: "none",
            host: security === 'tls' ? (stream.tlsSettings?.serverName || "") : "",
            path: type === 'ws' ? (stream.wsSettings?.path || "") : (type === 'xhttp' ? (stream.xhttpSettings?.path || "") : ""),
            tls: security === 'none' ? "" : security,
            sni: security === 'reality' ? (stream.realitySettings?.serverNames?.[0] || '') : (stream.tlsSettings?.serverName || ''),
            alpn: "",
            fp: security === 'reality' ? "chrome" : ""
        };

        return `vmess://${safeBase64(JSON.stringify(vmessObj))}`;
    }

    return null;
}
