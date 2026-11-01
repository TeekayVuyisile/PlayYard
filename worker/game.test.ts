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
