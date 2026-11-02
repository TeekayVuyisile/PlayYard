import { describe, expect, it } from 'vitest';
import { act, view, type State } from './game';
import { createAnswerGame, normalizeAnswer, PROMPTS, answerView, answersMatch } from './same-answer';

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
  it('has 120 distinct prompts and exhausts the bank before repeating across saved rematches',()=>{
    expect(PROMPTS).toHaveLength(120);
    expect(new Set(PROMPTS).size).toBe(PROMPTS.length);
    let game=createAnswerGame();
    for(let cycle=0;cycle<3;cycle++){
      const seen=new Set<string>();
      for(let match=0;match<PROMPTS.length/5;match++){
        for(const prompt of game.deck){expect(seen.has(prompt)).toBe(false);seen.add(prompt);}
        const oldDeck=[...game.deck];
        // Durable Object storage reloads JSON rather than retaining object identity.
        game=createAnswerGame(game.match+1,JSON.parse(JSON.stringify(game)));
        expect(game.deck.some(prompt=>oldDeck.includes(prompt))).toBe(false);
      }
      expect(seen.size).toBe(PROMPTS.length);
    }
  });
  it('upgrades an existing room without repeating its current prompts',()=>{
    const old=createAnswerGame();delete old.remainingPrompts;
    const fresh=createAnswerGame(2,old);
    expect(fresh.deck.some(prompt=>old.deck.includes(prompt))).toBe(false);
    expect(fresh.remainingPrompts).toHaveLength(PROMPTS.length-10);
  });
  it('keeps a round unique when its remaining bag runs out partway through',()=>{
    const old=createAnswerGame();old.remainingPrompts=old.remainingPrompts!.slice(0,2);
    const fresh=createAnswerGame(2,old);
    expect(new Set(fresh.deck).size).toBe(5);
    expect(fresh.deck.slice(0,2)).toEqual(old.remainingPrompts);
  });
  it('does not expose the unused prompt queue to either player',()=>{
    const game=createAnswerGame();
    for(const id of ['a','b']){
      expect(answerView(game,id)).not.toHaveProperty('remainingPrompts');
      expect(answerView(game,id)).not.toHaveProperty('deck');
    }
  });
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
    expect(s.sameAnswer!.score).toBe(2);expect(s.sameAnswer!.history[1].matched).toBe(true);
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
    const previousDeck=[...s.sameAnswer!.deck];
    act(s,'b',{type:'rematch',match:1,round:5});
    expect(s.sameAnswer!.deck.some(prompt=>previousDeck.includes(prompt))).toBe(false);
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
  it('normalizes formatting while preserving the original answer text',()=>{
    expect(normalizeAnswer('  ICE—cream!! ')).toBe('ice cream');
    expect(normalizeAnswer('ＰＩＺＺＡ')).toBe('pizza');
    expect(normalizeAnswer('  café   au lait ')).toBe('café au lait');
    expect(normalizeAnswer('apples')).not.toBe(normalizeAnswer('apple'));
  });
  it.each([
    ['fork','FORKS'],['fox','foxes'],['berry','berries'],['bus','buses'],
    ['glass','glasses'],['knife','knives'],['mouse','mice'],['child','children'],
    ['potato','potatoes'],['sheep','sheep'],['ice cream','ice creams'],
    ['red apple','red apples'],['cup of tea','cups of tea'],
    ['colour','COLORS'],['flavour','flavors'],['theatre','theaters'],
    ['bike','bicycles'],['couch','sofas'],['TV','televisions'],
    ['donut','doughnuts'],['airplane','aeroplanes'],['movie','films'],
    ['  ICE—cream!! ','icecream']
  ])('matches supported equivalents %s and %s in either order',(a,b)=>{
    expect(answersMatch(a,b)).toBe(true);expect(answersMatch(b,a)).toBe(true);
  });
  it.each([
    ['fork','fox'],['apple','pineapple'],['bus','bu'],['glass','glas'],
    ['news','new'],['red apple','green apples'],['hot dog','dog'],
    ['car','cart'],['chocolate cake','chocolate'],['tea','coffee'],
    ['cat','cats dog'],['!!!','???'],['','']
  ])('does not guess at different answers %s and %s',(a,b)=>{
    expect(answersMatch(a,b)).toBe(false);expect(answersMatch(b,a)).toBe(false);
  });
  it('scores equivalent answers once and reveals the exact submitted spelling',()=>{
    const s=room();submit(s,'a','Bike');submit(s,'b','BICYCLES');
    expect(s.sameAnswer!.score).toBe(1);
    expect(s.sameAnswer!.history[0]).toMatchObject({matched:true,answers:[
      {id:'a',text:'Bike'},{id:'b',text:'BICYCLES'}
    ]});
    expect(()=>submit(s,'b','bike')).toThrow('revealed');
    expect(s.sameAnswer!.score).toBe(1);
  });
});
