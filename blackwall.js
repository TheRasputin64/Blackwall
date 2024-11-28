const x = require('express'),
      n = x(),
      p = process.env.PORT || 3000,
      u = require('express-fileupload'),
      f = require('fs'),
      r = require('path'),
      w = require('http').createServer(n),
      io = require('socket.io')(w),
      j = 'firewall.json',
      s = 'shard.json';

const netrunnerUpload = (e) => {
    if (!e) return console.error('Attempted to write undefined data');
    const t = f.existsSync(j) ? JSON.parse(f.readFileSync(j, 'utf8') || '[]') : [],
          o = [...t, e];
    f.writeFileSync(j, JSON.stringify(o, null, 2));
};

const netrunnerWipe = () => {
    f.writeFileSync(j, JSON.stringify([]));
};

const iceBreakerPull = () => {
    try {
        return f.existsSync(j) ? JSON.parse(f.readFileSync(j, 'utf8') || '[]') : [];
    } catch (e) {
        return [];
    }
};

const deviceLinkPull = () => {
    try {
        return f.existsSync(s) ? JSON.parse(f.readFileSync(s, 'utf8') || '[]') : [];
    } catch (e) {
        return [];
    }
};

const checkDeviceActivity = (devices) => {
    const now = new Date();
    return devices.filter(device => {
        if (!device.lastActive) return false;
        const lastActiveTime = new Date(device.lastActive);
        const minutesSinceLastActive = (now - lastActiveTime) / (1000 * 60);
        return minutesSinceLastActive <= 5;
    });
};

const deviceLinkUpload = (e) => {
    if (!e) return console.error('Attempted to write undefined device');
    const t = deviceLinkPull(),
          existingDeviceIndex = t.findIndex(device => device.deviceId === e.deviceId);

    if (existingDeviceIndex !== -1) {
        t[existingDeviceIndex] = {
            ...t[existingDeviceIndex],
            ...e,
            lastActive: new Date().toISOString()
        };
    } else {
        t.push({
            ...e,
            lastActive: new Date().toISOString()
        });
    }

    f.writeFileSync(s, JSON.stringify(t, null, 2));
    return t;
};

const deviceLinkWipe = () => {
    f.writeFileSync(s, JSON.stringify([]));
};

const dataStreamFormat = (e) => (e || []).map(e => 
    `<tr><td class="compact-row">${typeof e.data === 'string' ? e.data : 
    Object.entries(e).filter(([k]) => k !== 'timestamp').map(([k, v]) => 
        `<div class="data-row"><span class="data-key">${k}:</span><span class="data-value">${JSON.stringify(v)}</span></div>`
    ).join('')}</td></tr>`
).join('');

const deviceLinkFormat = (e) => (e || []).map(e => 
    `<tr><td class="device-row">${Object.entries(e).map(([k, v]) => 
        k !== 'lastActive' ? 
        `<div class="data-row"><span class="data-key">${k}:</span><span class="data-value">${JSON.stringify(v)}</span></div>` : 
        ''
    ).join('')}<div class="data-row"><span class="data-key">Last Active:</span><span class="data-value">${e.lastActive || 'N/A'}</span></div></td></tr>`
).join('');

const sharedStyle = `<style>body{font-family:'Courier New',monospace;background-color:#000;color:#ff0000;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}h1{font-size:3rem;text-shadow:0 0 10px #ff0000}input,button{font-size:2rem;padding:0.5rem;background-color:#000;color:#ff0000;border:1px solid #ff0000;outline:none}button{background-color:#ff0000;color:#000;border:none;cursor:pointer}button:hover{background-color:#cc0000}</style>`;

const loginInterface = `<!DOCTYPE html><html><head><title>Blackwall Access</title>${sharedStyle}</head><body><div><h1>JACK INTO BLACKWALL</h1><form action="/jack-in" method="post"><input type="password" name="cyberkey" placeholder="TARGET_DATA"/><button type="submit">JACK IN</button></form></div></body></html>`;

const accessDenied = `<!DOCTYPE html><html><head><title>Access Denied</title>${sharedStyle}</head><body><div><h1>ACCESS DENIED</h1><form action="/jack-in" method="post"><input type="password" name="cyberkey" placeholder="TARGET_DATA"/><button type="submit">OVERRIDE</button></form></div></body></html>`;

const dashboardTemplate = `<!DOCTYPE html><html><head><title>Blackwall Dashboard</title><script src="/socket.io/socket.io.js"></script><style>body{font-family:'Courier New',monospace;background-color:#000;color:#ff0000;margin:0;padding:20px;height:100vh;display:flex;flex-direction:column;overflow:hidden}h1{font-size:3rem;text-shadow:0 0 10px #ff0000;margin:0;padding:10px 0}.data-container{flex:1;overflow-y:auto;margin:20px 0;border:1px solid #ff0000;background:rgba(0,0,0,0.9)}.data-container::-webkit-scrollbar{width:8px;background:linear-gradient(to bottom,#000,#ff0000,#000)}.data-container::-webkit-scrollbar-track{background:linear-gradient(to right,#000,rgba(255,0,0,0.1))}.data-container::-webkit-scrollbar-thumb{background:#ff0000;box-shadow:0 0 10px #ff0000}table{width:100%;border-collapse:collapse}th{background-color:#000;color:#ff0000;padding:10px;text-align:left;border:1px solid #ff0000;font-size:1.2rem;text-shadow:0 0 5px #ff0000}.compact-row{padding:7px;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}.device-row{padding:12px;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}td{border:1px solid #ff0000;color:#ff0000;background-color:#000;text-shadow:0 0 2px #ff0000}.data-row{padding:2px 0;font-size:0.8rem}.data-key{color:#ff6b6b;margin-right:10px;text-shadow:0 0 3px #ff0000}.data-value{color:#ff0000;text-shadow:0 0 2px #ff0000}.terminal-container{height:200px;border-top:1px solid #ff0000;background:rgba(0,0,0,0.95);padding:10px;position:relative;box-shadow:0 -5px 15px rgba(255,0,0,0.2)}.terminal-output{height:130px;overflow-y-auto;font-family:'Courier New',monospace;color:#ff0000;margin-bottom:10px;text-shadow:0 0 2px #ff0000}.terminal-input-line{display:flex;align-items:center;padding:5px 0}#terminal-input{background:transparent;border:none;color:#ff0000;flex:1;font-size:1rem;font-family:'Courier New',monospace;outline:none;text-shadow:0 0 2px #ff0000}.jack-out{position:absolute;top:20px;right:20px}button{background:#ff0000;color:#000;border:none;padding:10px 20px;cursor:pointer;font-size:1rem}button:hover{background-color:#cc0000}</style></head><body><form class="jack-out" action="/" method="get"><button type="submit">Jack Out</button></form><h1>Blackwall Dashboard</h1><div class="data-container"><table><thead><tr><th id="table-header">Neural Data Stream</th></tr></thead><tbody id="data-stream"></tbody></table></div><div class="terminal-container"><div class="terminal-output" id="terminal-output"></div><div class="terminal-input-line"><span style="color:#ff0000;margin-right:10px;text-shadow:0 0 2px #ff0000">>></span><input type="text" id="terminal-input" onkeypress="handleTerminal(event)" placeholder="[NETRUNNER_CMD]"/></div></div><script>const socket=io(),terminal=document.getElementById('terminal-output'),input=document.getElementById('terminal-input'),dataStream=document.getElementById('data-stream'),tableHeader=document.getElementById('table-header'),validCommands={'help':()=>'[QUANTUM PROTOCOL MATRIX]\\n'+'[HACK] <neural_shard>: Extract targeted neural data\\n'+'[CLS]   : Purge terminal quantum buffer\\n'+'[PING]  : Verify neural network integrity\\n'+'[VER]   : Expose BlackICE system configuration\\n'+'[WIPE]  : Neutralize entire neural stream\\n'+'[DATA]  : Return to neural data stream\\n'+'[LINK]  : Display active network devices','cls':()=>{terminal.innerText='';return'[QUANTUM BUFFER PURGED - NEURAL PATHWAYS CLEARED]'},'ping':()=>'[NEURAL NETWORK DIAGNOSTIC]\\n[STATUS]: QUANTUM LINK STABLE\\n[PROXY]: QUANTUM ENCRYPTION ENGAGED\\n[ICE]: ADAPTIVE DEFENSE MATRIX ONLINE','ver':()=>'[BLACKICE SYSTEM CONFIG]\\nQuantum Intrusion Countermeasure v2.0.77\\n[NETRUNNER_BUILD_771]: ACTIVE','wipe':()=>{socket.emit('wipe-data');return'[DECONSTRUCTING NEURAL ARCHITECTURE...]'},'data':()=>{socket.emit('show-data');return'[NEURAL STREAM RESTORED]'},'link':()=>{socket.emit('show-link');return'[NETWORK DEVICE SCAN INITIATED]'}};function handleTerminal(e){if(e.key==='Enter'){const cmd=input.value.toLowerCase().trim(),parts=cmd.split(' ');input.value='';if(parts[0]==='hack'){if(parts.length>1){socket.emit('download-file-request',{fileId:parts[1],type:'specific'});terminal.innerText='[QUANTUM SHARD EXTRACTION PROTOCOL INITIATED]\\n[TARGET VECTOR]: '+parts[1]+'\\n[STATUS]: BREACHING FIREWALL';}else{socket.emit('download-file-request',{type:'all'});terminal.innerText='[QUANTUM SHARD EXTRACTION PROTOCOL INITIATED]\\n[MODE]: TOTAL NEURAL CAPTURE\\n[STATUS]: BREACHING FIREWALL';}}else if(validCommands[cmd]){const output=validCommands[cmd]();if(output){terminal.innerText=output;}}else{terminal.innerText='[PROTOCOL ERROR] QUANTUM COMMAND NOT RECOGNIZED. USE "help" FOR VALID NEURAL PROTOCOLS';}}}socket.on('initial-data',(e)=>{dataStream.innerHTML=e;});socket.on('data-update',(e)=>{dataStream.innerHTML+=e;});socket.on('device-link-update',(e)=>{tableHeader.textContent='Active Network Devices';dataStream.innerHTML=e;});socket.on('show-data-table',(e)=>{tableHeader.textContent='Neural Data Stream';dataStream.innerHTML=e;});socket.on('download-file-error',(e)=>{terminal.innerText=e;});socket.on('download-redirect',(e)=>{window.location.href=e;});</script></body></html>`;

n.use(u()),
n.use(x.json()),
n.use(x.urlencoded({extended: !0})),
n.use(x.static(r.join(__dirname,'public'))),

io.on('connection', (e) => {
    e.emit('initial-data', dataStreamFormat(iceBreakerPull())),
    e.on('wipe-data', () => {
        netrunnerWipe();
        io.emit('initial-data', dataStreamFormat(iceBreakerPull()));
    }),
    e.on('device-heartbeat', (deviceData) => {
        const updatedDevices = deviceLinkUpload(deviceData);
        const activeDevices = checkDeviceActivity(updatedDevices);
        io.emit('device-link-update', deviceLinkFormat(activeDevices));
    }),
    e.on('download-file-request', (t) => {
        if (t.type === 'all') {
            e.emit('download-redirect', '/api/download');
        } else {
            const o = iceBreakerPull(),
                  a = o.find(o => o.id == t.fileId);
            a && f.existsSync(r.join(__dirname, 'DataCore', a.name)) ?
                e.emit('download-redirect', `/download/${a.id}`) :
                e.emit('download-file-error', '[PROTOCOL ERROR] INVALID NEURAL SHARD');
        }
    }),
    e.on('show-data', () => {
        e.emit('show-data-table', dataStreamFormat(iceBreakerPull()));
    }),
    e.on('show-link', () => {
        const devices = deviceLinkPull();
        const activeDevices = checkDeviceActivity(devices);
        e.emit('device-link-update', deviceLinkFormat(activeDevices));
    });
}),

n.get('/', (e, t) => t.send(loginInterface)),
n.get('/jack-in', (e, t) => t.send(loginInterface)),

n.post('/jack-in', (e, t) => {
    const {cyberkey: o} = e.body;
    'n3trunner' === o ? t.send(dashboardTemplate) : t.send(accessDenied);
}),

n.post('/api/netrunner', (e, t) => {
    try {
        if (!e.body || Object.keys(e.body).length === 0) 
            return t.status(400).json({error: 'No data provided'});
        
        const o = e.body;
        o.timestamp = new Date().toISOString(),
        netrunnerUpload(o),
        io.emit('data-update', dataStreamFormat([o])),
        t.json({message: 'Data uploaded to the Blackwall.'});
    } catch (e) {
        t.status(500).json({error: 'Failed to process data'});
    }
}),

n.post('/api/link', (e, t) => {
    try {
        if (!e.body || Object.keys(e.body).length === 0) 
            return t.status(400).json({error: 'No device data provided'});
        
        const o = e.body;
        const updatedDevices = deviceLinkUpload(o);
        const activeDevices = checkDeviceActivity(updatedDevices);
        io.emit('device-link-update', deviceLinkFormat(activeDevices));
        t.json({message: 'Device linked to Blackwall.'});
    } catch (e) {
        t.status(500).json({error: 'Failed to process device link'});
    }
}),

n.post('/api/wipe', (e, t) => {
    netrunnerWipe(),
    io.emit('initial-data', dataStreamFormat([])),
    t.json({message: 'Neural stream wiped.'});
}),

n.post('/api/wipe-link', (e, t) => {
    deviceLinkWipe(),
    t.json({message: 'Device link data wiped.'});
}),

n.get('/api/download', (e, t) => {
    const o = r.join(__dirname, j);
    f.existsSync(o) ? t.download(o) : t.status(404).send('[QUANTUM ERROR] FIREWALL SHARD NOT LOCATED');
}),

n.get('/download/:id', (e, t) => {
    const o = iceBreakerPull(),
          a = o.find(o => o.id == e.params.id);
    
    if (!a) {
        console.error(`[ERROR] No file found with ID: ${e.params.id}`);
        return t.status(404).send('[QUANTUM ERROR] FILE SHARD NOT LOCATED');}

    const l = r.join(__dirname, 'DataCore', a.name);
    
    if (!f.existsSync(l)) {
        console.error(`[ERROR] File does not exist: ${l}`);
        return t.status(404).send('File not found');
    }
    
    t.download(l);
}),

n.get('/shard.exe', (e, t) => {
    t.download('shard.exe');
}),

n.post('/api/data', (e, t) => {
    const o = r.join(__dirname, 'DataCore', e.files.file.name),
          a = {
              id: Date.now(),
              name: e.files.file.name,
              size: e.files.file.size
          };
    
    f.mkdirSync(r.join(__dirname, 'DataCore'), {recursive: !0}),
    f.writeFileSync(o, e.files.file.data),
    netrunnerUpload(a),
    io.emit('data-update', dataStreamFormat([a])),
    t.json({message: 'File uploaded successfully'});
}),

w.listen(p, () => console.log(`Netrunner server running on port ${p}`));
