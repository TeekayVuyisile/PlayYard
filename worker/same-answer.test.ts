import { describe, expect, it } from 'vitest';
import { act, view, type State } from './game';
import { createAnswerGame, normalizeAnswer } from './same-answer';

function room(): State {
  return {code:'ABCDEF',min:0,max:500,players:[{id:'a',name:'Alex'},{id:'b',name:'Sam'}],turn:0,guesses:[],messages:[],game:'answer',sameAnswer:createAnswerGame()};
}
function submit(s:State,id:string,text:unknown) {
  act(s,id,{type:'answer-submit',match:s.sameAnswer!.match,round:s.sameAnswer!.round,text});
}
function next(s:State,id:string) {
  act(s,id,{type:'answer-next',match:s.sameAnswer!.match,round:s.sameAnswer!.round});
}
describe('Same Answer',()=>{
  it('deals five unique prompts and keeps unrevealed answers and future prompts private',()=>{
    const s=room();expect(new Set(s.sameAnswer!.deck).size).toBe(5);
    submit(s,'a','Pizza!');
    const theirs=view(s,'b').sameAnswer!;
    expect(theirs.answers.a).toEqual({submitted:true});
    expect(theirs).not.toHaveProperty('deck');expect(theirs.history).toEqual([]);
    expect(view(s,'a').sameAnswer!.answers.a.text).toBe('Pizza!');
    expect(()=>submit(s,'a','Burger')).toThrow('locked');
    submit(s,'b',' pizza ');
    expect(s.sameAnswer!.score).toBe(1);expect(s.sameAnswer!.revealed).toBe(true);
    expect(view(s,'b').sameAnswer!.answers.a.text).toBe('Pizza!');
    expect(s.sameAnswer!.history).toHaveLength(1);
  });
  it('requires both confirmations, prevents stale actions and scores exactly once',()=>{
    const s=room();submit(s,'a','Ice cream');submit(s,'b','ice-cream');
    next(s,'a');next(s,'a');expect(s.sameAnswer!.round).toBe(1);
    expect(s.sameAnswer!.nextReady).toEqual(['a']);
    next(s,'b');expect(s.sameAnswer!.round).toBe(2);
    expect(s.sameAnswer!.answers).toEqual({});expect(s.sameAnswer!.revealed).toBe(false);
    expect(()=>act(s,'b',{type:'answer-submit',match:1,round:1,text:'late'})).toThrow('ended');
    submit(s,'a','apple');submit(s,'b','apples');
    expect(s.sameAnswer!.score).toBe(1);expect(s.sameAnswer!.history[1].matched).toBe(false);
    expect(()=>submit(s,'a','apples')).toThrow('revealed');expect(s.sameAnswer!.history).toHaveLength(2);
  });
  it('finishes five rounds and starts a clean rematch only after both agree',()=>{
    const s=room();
    for(let i=1;i<=5;i++){
      submit(s,'a','same');submit(s,'b','SAME');
      if(i<5){next(s,'a');next(s,'b');}
    }
    expect(s.sameAnswer!.finished).toBe(true);expect(s.sameAnswer!.score).toBe(5);
    expect(s.sameAnswer!.history).toHaveLength(5);
    expect(()=>next(s,'a')).toThrow('Finish');
    act(s,'a',{type:'rematch',match:1,round:5});expect(s.sameAnswer!.finished).toBe(true);
    act(s,'b',{type:'rematch',match:1,round:5});
    expect(s.sameAnswer!.match).toBe(2);expect(s.sameAnswer!.round).toBe(1);
    expect(s.sameAnswer!.score).toBe(0);expect(s.sameAnswer!.history).toEqual([]);
    expect(s.sameAnswer!.answers).toEqual({});expect(s.sameAnswer!.nextReady).toEqual([]);
    expect(()=>act(s,'a',{type:'answer-submit',match:1,round:1,text:'old match'})).toThrow('ended');
  });
  it('validates answers, readiness, membership and game boundaries',()=>{
    const s=room();
    for(const text of ['', '   ', '!!!', 'x'.repeat(61),42,null])expect(()=>submit(s,'a',text)).toThrow('1–60');
    expect(()=>submit(s,'x','hello')).toThrow('Join');
    expect(()=>next(s,'a')).toThrow('Finish');
    expect(()=>act(s,'a',{type:'rematch',match:1,round:1})).toThrow('five');
    expect(()=>act(s,'a',{type:'secret',value:1})).toThrow('Same Answer');
    expect(()=>act(s,'a',{type:'timer-start',round:1})).toThrow('Stop the Clock');
    s.players.pop();expect(()=>submit(s,'a','hello')).toThrow('join');
    s.game='number';expect(()=>submit(s,'a','hello')).toThrow('Same Answer');
  });
  it('normalizes formatting without fuzzy or plural matching',()=>{
    expect(normalizeAnswer('  ICE—cream!! ')).toBe('ice cream');
    expect(normalizeAnswer('ＰＩＺＺＡ')).toBe('pizza');
    expect(normalizeAnswer('  café   au lait ')).toBe('café au lait');
    expect(normalizeAnswer('apples')).not.toBe(normalizeAnswer('apple'));
  });
});
