import { describe, expect, it } from 'vitest';
import { act, view, type State } from './game';
function room(): State { return { code:'ABCDEF', min:0, max:500, players:[{id:'a',name:'A'},{id:'b',name:'B'}], turn:0, guesses:[], messages:[] }; }
describe('Guess My Number rules', () => {
  it('keeps opponent secrets private and alternates turns until an exact guess wins', () => {
    const s=room(); act(s,'a',{type:'secret',value:390}); act(s,'b',{type:'secret',value:495});
    expect(view(s,'b').players[0]).not.toHaveProperty('secret');
    expect(() => act(s,'b',{type:'guess',value:400})).toThrow('turn');
    act(s,'a',{type:'guess',value:400}); expect(s.guesses[0].result).toBe('higher');
    act(s,'b',{type:'guess',value:400}); expect(s.guesses[1].result).toBe('lower');
    act(s,'a',{type:'guess',value:495}); expect(s.winner).toBe('a');
    expect(() => act(s,'b',{type:'guess',value:390})).toThrow('ended');
    act(s,'b',{type:'rematch'}); expect(s.players.every(p=>p.secret===undefined)).toBe(true);
  });
  it('validates boundaries, readiness, membership, and immutable secrets', () => {
    const s=room(); expect(()=>act(s,'a',{type:'guess',value:0})).toThrow('Wait');
    expect(()=>act(s,'x',{type:'secret',value:1})).toThrow('Join');
    for (const value of [-1,501,0.5,'3',NaN]) expect(()=>act(s,'a',{type:'secret',value})).toThrow('whole');
    act(s,'a',{type:'secret',value:0}); expect(()=>act(s,'a',{type:'secret',value:1})).toThrow('locked');
    act(s,'b',{type:'secret',value:500}); act(s,'a',{type:'guess',value:500}); expect(s.winner).toBe('a');
  });
});

function timerRoom(): State {
  return { ...room(), game:'timer', timer:{targetMs:10000,hidden:true,round:1,attempts:{},finished:false} };
}
describe('Stop the Clock rules', () => {
  it('hides opposing results until both submit, then selects the closest time', () => {
    const s=timerRoom();
    act(s,'a',{type:'timer-start',round:1},1000);
    act(s,'b',{type:'timer-start',round:1},2000);
    act(s,'a',{type:'timer-stop',round:1,elapsedMs:9900},10900);
    expect(view(s,'b').timer?.attempts.a).toEqual({started:true,submitted:true});
    expect(view(s,'a').timer?.attempts.a.elapsedMs).toBe(9900);
    expect(s.winner).toBeUndefined();
    expect(()=>act(s,'a',{type:'timer-stop',round:1,elapsedMs:10000},11000)).toThrow('locked');
    act(s,'b',{type:'timer-stop',round:1,elapsedMs:10050},12050);
    expect(s.winner).toBe('b');expect(s.timer?.finished).toBe(true);
    expect(view(s,'b').timer?.attempts.a.elapsedMs).toBe(9900);
    act(s,'a',{type:'rematch',round:1},13000);
    expect(s.timer?.round).toBe(2);expect(s.timer?.attempts).toEqual({});expect(s.winner).toBeUndefined();
    expect(()=>act(s,'b',{type:'rematch',round:1})).toThrow();
    expect(()=>act(s,'b',{type:'timer-start',round:1})).toThrow('ended');
  });
  it('supports draws and blocks premature rounds, invalid times and cross-game actions', () => {
    const s=timerRoom();
    expect(()=>act(s,'a',{type:'timer-stop',round:1,elapsedMs:10000})).toThrow('Start');
    expect(()=>act(s,'a',{type:'rematch',round:1})).toThrow('Finish');
    expect(()=>act(s,'a',{type:'secret',value:30})).toThrow('Stop the Clock');
    expect(()=>act(room(),'a',{type:'timer-start',round:1})).toThrow('Guess My Number');
    act(s,'a',{type:'timer-start',round:1},0);act(s,'b',{type:'timer-start',round:1},0);
    for(const elapsedMs of [-1,60001,1.5,NaN,'10000']) expect(()=>act(s,'a',{type:'timer-stop',round:1,elapsedMs},10000)).toThrow('Invalid');
    expect(()=>act(s,'a',{type:'timer-stop',round:1,elapsedMs:10000},200)).toThrow('sync');
    act(s,'a',{type:'timer-stop',round:1,elapsedMs:9900},9900);
    act(s,'b',{type:'timer-stop',round:1,elapsedMs:10100},10100);
    expect(s.timer?.draw).toBe(true);expect(s.timer?.finished).toBe(true);expect(s.winner).toBeUndefined();
    expect(()=>act(s,'a',{type:'timer-start',round:1})).toThrow('ended');
    act(s,'a',{type:'rematch',round:1});expect(s.timer?.draw).toBeUndefined();
  });
  it('allows interruption recovery without changing submitted times', () => {
    const s=timerRoom();s.players.pop();
    expect(()=>act(s,'a',{type:'timer-start',round:1})).toThrow('join');
    s.players.push({id:'b',name:'B'});
    act(s,'a',{type:'timer-start',round:1},0);
    expect(()=>act(s,'a',{type:'timer-start',round:1},100)).toThrow('already');
    act(s,'a',{type:'timer-reset',round:1},100);expect(s.timer?.attempts.a).toBeUndefined();
    act(s,'a',{type:'timer-start',round:1},1000);
    act(s,'a',{type:'timer-stop',round:1,elapsedMs:10000},11000);
    expect(()=>act(s,'a',{type:'timer-reset',round:1})).toThrow('submitted');
  });
});
