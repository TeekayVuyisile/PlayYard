import assert from 'node:assert/strict';
import WebSocket from 'ws';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5173';
async function post(path,body,cookie){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
function client(code,cookie){
  const ws=new WebSocket(base.replace(/^http/,'ws')+`/api/rooms/${code}/socket`,{headers:{Cookie:cookie,Origin:base}});
  const queue=[],waiters=[];
  ws.on('message',raw=>{const value=JSON.parse(raw.toString());const resolve=waiters.shift();if(resolve)resolve(value);else queue.push(value);});
  ws.on('error',e=>{console.error(e.message);});
  return {ws,async next(){if(queue.length)return queue.shift();return Promise.race([new Promise(resolve=>waiters.push(resolve)),new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('WebSocket message timed out')),8000);t.unref();})]);},async send(action){await new Promise(r=>setTimeout(r,300));ws.send(JSON.stringify(action));}};
}
let a,b;
try {
  const created=await post('/api/rooms',{name:'Player A',min:0,max:500});assert.equal(created.status,200);
  const {code,id:aid}=created.body;
  const joined=await post(`/api/rooms/${code}/join`,{name:'Player B'});assert.equal(joined.status,200);
  const bid=joined.body.id;
  assert.notEqual(aid,bid);
  assert.equal((await post(`/api/rooms/${code}/join`,{name:'Third player'})).status,400);
  assert.equal((await post(`/api/rooms/${code}/voice`,{})).status,403);
  a=client(code,created.cookie);b=client(code,joined.cookie);
  assert.equal((await a.next()).data.players.length,2);await b.next();
  await a.send({type:'secret',value:390});await a.next();let snapshot=(await b.next()).data;
  assert.equal(snapshot.players.find(p=>p.id===aid).secret,undefined);
  await b.send({type:'secret',value:495});await a.next();await b.next();
  await b.send({type:'guess',value:400});assert.match((await b.next()).error,/turn/);
  await a.send({type:'guess',value:400});assert.equal((await a.next()).data.guesses.at(-1).result,'higher');await b.next();
  await b.send({type:'guess',value:400});await a.next();assert.equal((await b.next()).data.guesses.at(-1).result,'lower');
  await a.send({type:'guess',value:495});assert.equal((await a.next()).data.winner,aid);await b.next();
  await b.send({type:'chat',text:'Good game!'});assert.equal((await a.next()).data.messages.at(-1).text,'Good game!');await b.next();
  await a.send({type:'rematch'});snapshot=(await a.next()).data;await b.next();assert.equal(snapshot.turn,1);assert.equal(snapshot.winner,undefined);assert.ok(snapshot.players.every(p=>!p.ready));
  a.ws.close();a=client(code,created.cookie);assert.equal((await a.next()).data.code,code);
  const voiceStatus=(await post(`/api/rooms/${code}/voice`,{},created.cookie)).status;
  assert.ok([200,503].includes(voiceStatus),'Voice must return a member token or report missing configuration.');
  const spoofed=await post(`/api/rooms/${code}/join`,{name:'Spoofed'},'player='+aid);assert.equal(spoofed.status,400);
  a.ws.close();b.ws.close();
  const clock=await post('/api/rooms',{name:'Clock A',game:'timer',targetMs:1000,hidden:true});assert.equal(clock.status,200);
  const clockCode=clock.body.code,clockA=clock.body.id;
  const clockJoin=await post(`/api/rooms/${clockCode}/join`,{name:'Clock B'});assert.equal(clockJoin.status,200);
  const clockB=clockJoin.body.id;
  a=client(clockCode,clock.cookie);b=client(clockCode,clockJoin.cookie);
  assert.equal((await a.next()).data.timer.targetMs,1000);await b.next();
  await a.send({type:'timer-start',round:1});await a.next();await b.next();
  await b.send({type:'timer-start',round:1});await a.next();await b.next();
  await a.send({type:'timer-stop',round:1,elapsedMs:350});await a.next();snapshot=(await b.next()).data;
  assert.equal(snapshot.timer.attempts[clockA].submitted,true);assert.equal(snapshot.timer.attempts[clockA].elapsedMs,undefined);
  assert.equal(snapshot.timer.finished,false);
  await b.send({type:'timer-stop',round:1,elapsedMs:950});snapshot=(await a.next()).data;await b.next();
  assert.equal(snapshot.winner,clockB);assert.equal(snapshot.timer.finished,true);assert.equal(snapshot.timer.attempts[clockB].elapsedMs,950);
  await a.send({type:'rematch',round:1});snapshot=(await a.next()).data;await b.next();
  assert.equal(snapshot.timer.round,2);assert.deepEqual(snapshot.timer.attempts,{});
  await b.send({type:'timer-start',round:1});assert.match((await b.next()).error,/round has ended/);
  a.ws.close();a=client(clockCode,clock.cookie);assert.equal((await a.next()).data.timer.round,2);
  console.log('PASS: number-game match, privacy, turns, chat, rematches, reconnect, capacity, voice authorization, timer scoring, hidden results, stale-round rejection, and timer reconnect.');
} finally {a?.ws.close();b?.ws.close();}
