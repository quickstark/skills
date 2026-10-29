const ws = new WebSocket('ws://127.0.0.1:9331/session');
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let id=0;const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.type==='error'?p.reject(m):p.resolve(m.result);}};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
try {
 console.log(JSON.stringify(await cmd('session.new',{capabilities:{alwaysMatch:{}}})));
 console.log(JSON.stringify(await cmd('browsingContext.getTree',{})));
}finally {await cmd('session.end');ws.close();}
