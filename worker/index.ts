import { createMemory, createFuse, nextTimedDeadline, tickTimedGames } from './timed-games';
import { createPrism, createPoison } from './hidden-duels';
import { createImposter } from './imposter';
import { createChess } from './chess';
import { DurableObject } from 'cloudflare:workers';
import { AccessToken } from 'livekit-server-sdk';
import { act, view, integer, type State } from './game';
import { createAnswerGame } from './same-answer';
interface Env { ROOMS: DurableObjectNamespace<GameRoom>; LIVEKIT_URL?: string; LIVEKIT_API_KEY?: string; LIVEKIT_API_SECRET?: string }
const json = (data: unknown, status = 200) => Response.json(data, { status });
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return new Response('Not found', {status:404});
    if (req.headers.get('Origin') && req.headers.get('Origin') !== url.origin) return json({error:'Cross-origin request rejected.'},403);
    if (Number(req.headers.get('content-length') || 0) > 4096) return json({error:'Request too large.'},413);
    let id = req.headers.get('Cookie')?.match(/(?:^|;\s*)player=([a-f0-9-]{36})(?:;|$)/)?.[1];
    const fresh = !id; id ||= crypto.randomUUID();
    try {
      let code: string, path: string;
      if (url.pathname === '/api/rooms' && req.method === 'POST') {
        code = Array.from(crypto.getRandomValues(new Uint8Array(8)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');
        path = '/create';
      } else {
        const match = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{8})\/(join|socket|voice)$/);
        if (!match) return json({error:'Room not found. Check the invitation code.'},404);
        code = match[1]; path = '/'+match[2];
      }
      const identityBytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));
      const identity = Array.from(new Uint8Array(identityBytes),b=>b.toString(16).padStart(2,'0')).join('');
      const headers = new Headers(req.headers); headers.set('X-Player',identity);
      const target = new URL(req.url); target.pathname = path; target.search = ''; target.searchParams.set('code',code);
      const result = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(target, {method:req.method, headers, body:req.method === 'POST' ? req.body : undefined}));
      if (result.status === 101) return result;
      const out = new Response(result.body,result);
      out.headers.set('Cache-Control','no-store');
      if (fresh) out.headers.append('Set-Cookie',`player=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${url.protocol==='https:'?'; Secure':''}`);
      return out;
    } catch { return json({error:'Could not complete that request. Please try again.'},400); }
  }
};
export class GameRoom extends DurableObject<Env> {
  state?: State;
  lastAction = new Map<string,number>();
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx,env);
    ctx.blockConcurrencyWhile(async()=>{ this.state = await ctx.storage.get<State>('room'); if (this.state && !this.state.expiresAt) this.state.expiresAt = await ctx.storage.getAlarm() ?? Date.now()+24*60*60*1000; });
  }
  async save(touch = true) {
    if (touch) this.state!.expiresAt = Date.now()+24*60*60*1000;
    await this.ctx.storage.put('room',this.state);
    await this.schedule();
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(JSON.stringify({type:'state',data:view(this.state!,ws.deserializeAttachment().id)})); } catch { /* Closed sockets are removed by runtime. */ }
    }
  }
  async schedule() {
    if (!this.state) return;
    const deadline = nextTimedDeadline(this.state);
    await this.ctx.storage.setAlarm(Math.max(Date.now()+1,Math.min(this.state.expiresAt!,deadline??Infinity)));
  }
  async expire() {
    this.ctx.getWebSockets().forEach(ws=>ws.close(1000,'Room expired'));
    await this.ctx.storage.deleteAll(); this.state=undefined;
  }
  async advance() {
    if (!this.state) return;
    const now = Date.now();
    if (this.state.expiresAt! <= now) { await this.expire(); return; }
    if (tickTimedGames(this.state,now)) await this.save(false);
  }
  async fetch(req: Request) {
    const url=new URL(req.url), id=req.headers.get('X-Player')!;
    try {
      await this.advance();
      if (url.pathname==='/create' || url.pathname==='/join') {
        if (req.method!=='POST') return json({error:'POST required.'},405);
        const input = await req.json() as {name?:unknown;min?:unknown;max?:unknown;game?:unknown;targetMs?:unknown;hidden?:unknown;mode?:unknown;rounds?:unknown};
        if (typeof input.name!=='string' || !input.name.trim() || input.name.trim().length>20) throw new Error('Choose a nickname of 1–20 characters.');
        if (url.pathname==='/create') {
          if (this.state) throw new Error('Room already exists. Try again.');
          if (input.game !== undefined && input.game !== 'number' && input.game !== 'timer' && input.game !== 'answer' && input.game !== 'imposter' && input.game !== 'chess' && input.game !== 'prism' && input.game !== 'poison' && input.game !== 'memory' && input.game !== 'fuse') throw new Error('Choose an available game.');
          if (input.game === 'timer') {
            if (!integer(input.targetMs,1000,30000)) throw new Error('Choose a target between 1 and 30 seconds.');
            if (typeof input.hidden !== 'boolean') throw new Error('Choose whether the timer is hidden.');
          } else if (input.game === 'imposter') {
            if (!['words','drawing'].includes(input.mode as string) || !integer(input.rounds,1,5)) throw new Error('Choose word or drawing mode and 1–5 rounds.');
          } else if ((!input.game || input.game === 'number') && (!integer(input.min,0,1000000) || !integer(input.max,0,1000000) || input.min>=input.max)) throw new Error('Use a whole-number range between 0 and 1,000,000.');
          const game = (input.game || 'number') as NonNullable<State['game']>;
          this.state={
            code:url.searchParams.get('code')!, game,
            min:game==='number'?input.min as number:0,
            max:game==='number'?input.max as number:500,
            players:[],turn:0,guesses:[],messages:[],
            ...(game==='timer'?{timer:{targetMs:input.targetMs as number,hidden:input.hidden as boolean,round:1,attempts:{},finished:false}}:{}),
            ...(game==='answer'?{sameAnswer:createAnswerGame()}:{}),
            ...(game==='imposter'?{imposter:createImposter(input.mode as 'words'|'drawing',input.rounds as number)}:{}),
            ...(game==='chess'?{chess:createChess(id)}:{}),
            ...(game==='prism'?{prism:createPrism()}:{}),
            ...(game==='poison'?{poison:createPoison()}:{}),
            ...(game==='memory'?{memory:createMemory()}:{}),
            ...(game==='fuse'?{fuse:createFuse()}:{})
          };
        }
        if (!this.state) return json({error:'This room does not exist or has expired.'},404);
        if (!this.state.players.some(p=>p.id===id)) {
          if (this.state.game==='imposter' && this.state.imposter!.phase!=='lobby' && this.state.imposter!.phase!=='finished') throw new Error('This match has started. Join after the reveal.');
          if (this.state.game==='fuse' && this.state.fuse!.phase!=='lobby' && this.state.fuse!.phase!=='finished') throw new Error('This match has started. Join after the winner is decided.');
          const capacity=(this.state.game==='imposter'||this.state.game==='fuse')?8:2;
          if (this.state.players.length>=capacity) throw new Error(capacity===2?'This two-player room is full.':'This eight-player room is full.');
          this.state.players.push({id,name:input.name.trim()});
        }
        await this.save(); return json({code:this.state.code,id});
      }
      if (!this.state) return json({error:'This room has expired.'},404);
      if (!this.state.players.some(p=>p.id===id)) return json({error:'Join this room first.'},403);
      if (url.pathname==='/socket') {
        if (req.headers.get('Upgrade')?.toLowerCase()!=='websocket') return json({error:'WebSocket required.'},426);
        const existing=this.ctx.getWebSockets().filter(ws=>ws.deserializeAttachment().id===id);
        existing.forEach(ws=>ws.close(1000,'Opened in another tab'));
        const pair=new WebSocketPair(); this.ctx.acceptWebSocket(pair[1]); pair[1].serializeAttachment({id});
        pair[1].send(JSON.stringify({type:'state',data:view(this.state,id)}));
        return new Response(null,{status:101,webSocket:pair[0]});
      }
      if (url.pathname==='/voice' && req.method==='POST') {
        if (!this.env.LIVEKIT_URL || !this.env.LIVEKIT_API_KEY || !this.env.LIVEKIT_API_SECRET) return json({error:'Voice is not configured yet. Text chat is available.'},503);
        const token=new AccessToken(this.env.LIVEKIT_API_KEY,this.env.LIVEKIT_API_SECRET,{identity:id,name:this.state.players.find(p=>p.id===id)!.name,ttl:'10m'});
        token.addGrant({roomJoin:true,room:'game-hub-'+this.state.code,canPublish:true,canSubscribe:true,canPublishData:false});
        return json({token:await token.toJwt(),url:this.env.LIVEKIT_URL});
      }
      return json({error:'Not found'},404);
    } catch(e) { return json({error:e instanceof Error?e.message:'Invalid request.'},400); }
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      await this.advance();
      if (!this.state) return;
      if(typeof message!=='string'||message.length>8192) throw new Error('Message too large.');
      const {id}=ws.deserializeAttachment(); const now=Date.now();
      const action=JSON.parse(message);
      if (!action || typeof action!=='object') throw new Error('Invalid action.');
      const actionKey = `${id}:${['timer-start','timer-stop','timer-reset','fuse-pass'].includes(action.type) ? action.type : 'other'}`;
      if (now-(this.lastAction.get(actionKey)||0)<250) throw new Error('Please slow down.');
      this.lastAction.set(actionKey,now);
      act(this.state!,id,action,now); await this.save();
    } catch(e) { ws.send(JSON.stringify({type:'error',error:e instanceof Error?e.message:'Invalid action.'})); }
  }
  async alarm() {
    await this.advance();
    // Repeated or early alarm delivery cannot apply a second life loss.
    if (this.state) await this.schedule();
  }
}
