export const PROMPTS = [
  'Name a midnight snack.',
  'Name something you take to the beach.',
  'Name a pizza topping.',
  'Name an animal you would love as a tiny pet.',
  'Name something you find in a school bag.',
  'Name a flavour of ice cream.',
  'Name something that makes a rainy day better.',
  'Name a fruit you would put in a smoothie.',
  'Name a colour for a superhero cape.',
  'Name something you eat with your hands.',
  'Name something you would bring on a road trip.',
  'Name a sport played with a ball.',
  'Name something you can see in the night sky.',
  'Name an animal that lives in water.',
  'Name something that belongs at a birthday party.',
  'Name something you would build out of sand.',
  'Name a food that tastes better when it is hot.',
  'Name something you would find in a park.',
  'Name a musical instrument.',
  'Name something you wear when it is cold.',
  'Name a vegetable that goes in soup.',
  'Name something you would put on a sandwich.',
  'Name a place you would visit on a day off.',
  'Name something that flies.'
];

export type AnswerReveal = {
  prompt: string; matched: boolean;
  answers: { id: string; name: string; text: string }[];
};
export type AnswerGame = {
  match: number; round: number; totalRounds: number; deck: string[];
  answers: Record<string, string>; revealed: boolean; finished: boolean;
  score: number; history: AnswerReveal[]; nextReady: string[];
};

export function createAnswerGame(match = 1): AnswerGame {
  const deck = [...PROMPTS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { match, round: 1, totalRounds: 5, deck: deck.slice(0,5), answers: {}, revealed: false, finished: false, score: 0, history: [], nextReady: [] };
}

export function normalizeAnswer(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function answerAction(game: AnswerGame, players: {id:string;name:string}[], id: string, action: Record<string, unknown>) {
  if (action.match !== game.match || action.round !== game.round) throw new Error('That prompt has ended. Use the current round.');
  if (players.length !== 2) throw new Error('Wait for your friend to join.');
  if (action.type === 'answer-submit') {
    if (game.revealed || game.finished) throw new Error('This prompt has already been revealed.');
    if (Object.hasOwn(game.answers,id)) throw new Error('Your answer is already locked in.');
    if (typeof action.text !== 'string' || action.text.length > 60 || !normalizeAnswer(action.text)) throw new Error('Use 1–60 characters, including letters or numbers.');
    game.answers[id] = action.text.trim();
    if (players.every(p => Object.hasOwn(game.answers,p.id))) {
      const matched = normalizeAnswer(game.answers[players[0].id]) === normalizeAnswer(game.answers[players[1].id]);
      game.revealed = true;
      game.score += matched ? 1 : 0;
      game.history.push({ prompt: game.deck[game.round-1], matched, answers: players.map(p=>({id:p.id,name:p.name,text:game.answers[p.id]})) });
      game.finished = game.round === game.totalRounds;
    }
  } else if (action.type === 'answer-next') {
    if (!game.revealed || game.finished) throw new Error('Finish the current prompt first.');
    if (!game.nextReady.includes(id)) game.nextReady.push(id);
    if (players.every(p=>game.nextReady.includes(p.id))) {
      game.round++; game.answers = {}; game.revealed = false; game.nextReady = [];
    }
  } else if (action.type === 'rematch') {
    if (!game.finished) throw new Error('Finish all five rounds first.');
    if (!game.nextReady.includes(id)) game.nextReady.push(id);
    if (players.every(p=>game.nextReady.includes(p.id))) Object.assign(game,createAnswerGame(game.match+1));
  } else throw new Error('Unknown Same Answer action.');
}

export function answerView(game: AnswerGame, id: string) {
  const {deck,answers,...publicState} = game;
  return { ...publicState, prompt:deck[game.round-1], answers:Object.fromEntries(Object.entries(answers).map(([playerId,text])=>[playerId,{
    submitted:true,...(playerId===id||game.revealed?{text}:{})
  }])) };
}
