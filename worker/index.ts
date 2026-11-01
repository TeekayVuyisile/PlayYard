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
    ctx.blockConcurrencyWhile(async()=>{ this.state = await ctx.storage.get<State>('room'); });
  }
  async save() {
    await this.ctx.storage.put('room',this.state);
    await this.ctx.storage.setAlarm(Date.now()+24*60*60*1000);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(JSON.stringify({type:'state',data:view(this.state!,ws.deserializeAttachment().id)})); } catch { /* Closed sockets are removed by runtime. */ }
    }
  }
  async fetch(req: Request) {
    const url=new URL(req.url), id=req.headers.get('X-Player')!;
    try {
      if (url.pathname==='/create' || url.pathname==='/join') {
        if (req.method!=='POST') return json({error:'POST required.'},405);
        const input = await req.json() as {name?:unknown;min?:unknown;max?:unknown;game?:unknown;targetMs?:unknown;hidden?:unknown};
        if (typeof input.name!=='string' || !input.name.trim() || input.name.trim().length>20) throw new Error('Choose a nickname of 1–20 characters.');
        if (url.pathname==='/create') {
          if (this.state) throw new Error('Room already exists. Try again.');
          if (input.game !== undefined && input.game !== 'number' && input.game !== 'timer' && input.game !== 'answer') throw new Error('Choose an available game.');
          if (input.game === 'timer') {
            if (!integer(input.targetMs,1000,30000)) throw new Error('Choose a target between 1 and 30 seconds.');
            if (typeof input.hidden !== 'boolean') throw new Error('Choose whether the timer is hidden.');
          } else if (input.game !== 'answer' && (!integer(input.min,0,1000000) || !integer(input.max,0,1000000) || input.min>=input.max)) throw new Error('Use a whole-number range between 0 and 1,000,000.');
          const game = input.game === 'timer' ? 'timer' : input.game === 'answer' ? 'answer' : 'number';
          this.state={
            code:url.searchParams.get('code')!, game,
            min:game==='number'?input.min as number:0,
            max:game==='number'?input.max as number:500,
            players:[],turn:0,guesses:[],messages:[],
            ...(game==='timer'?{timer:{targetMs:input.targetMs as number,hidden:input.hidden as boolean,round:1,attempts:{},finished:false}}:{}),
            ...(game==='answer'?{sameAnswer:createAnswerGame()}:{})
          };
        }
        if (!this.state) return json({error:'This room does not exist or has expired.'},404);
        if (!this.state.players.some(p=>p.id===id)) {
          if (this.state.players.length>=2) throw new Error('This two-player room is full.');
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
      if(typeof message!=='string'||message.length>1024) throw new Error('Message too large.');
      const {id}=ws.deserializeAttachment(); const now=Date.now();
      const action=JSON.parse(message);
      if (!action || typeof action!=='object') throw new Error('Invalid action.');
      const actionKey = `${id}:${['timer-start','timer-stop','timer-reset'].includes(action.type) ? action.type : 'other'}`;
      if (now-(this.lastAction.get(actionKey)||0)<250) throw new Error('Please slow down.');
      this.lastAction.set(actionKey,now);
      act(this.state!,id,action); await this.save();
    } catch(e) { ws.send(JSON.stringify({type:'error',error:e instanceof Error?e.message:'Invalid action.'})); }
  }
  async alarm() { this.ctx.getWebSockets().forEach(ws=>ws.close(1000,'Room expired')); await this.ctx.storage.deleteAll(); this.state=undefined; }
}
