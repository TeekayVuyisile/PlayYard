import { EXTRA_PROMPTS } from './same-answer-prompts';

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
  'Name something that flies.',
  ...EXTRA_PROMPTS
];

export type AnswerReveal = {
  prompt: string; matched: boolean;
  answers: { id: string; name: string; text: string }[];
};
export type AnswerGame = {
  match: number; round: number; totalRounds: number; deck: string[];
  answers: Record<string, string>; revealed: boolean; finished: boolean;
  score: number; history: AnswerReveal[]; nextReady: string[];
  remainingPrompts?: string[];
};

function shuffled(prompts: string[]) {
  const deck = [...prompts];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createAnswerGame(match = 1, previous?: AnswerGame): AnswerGame {
  // Keep the bag in durable room state so rematches and reconnects share it.
  // Older rooms have no bag yet; avoid repeating their current match on upgrade.
  const remaining = previous?.remainingPrompts ? [...previous.remainingPrompts]
    : shuffled(PROMPTS.filter(prompt => !previous?.deck.includes(prompt)));
  const deck: string[] = [];
  while (deck.length < 5) {
    if (!remaining.length) {
      const recent = new Set([...(previous?.deck ?? []), ...deck]);
      remaining.push(...shuffled(PROMPTS.filter(prompt => !recent.has(prompt))),
        ...shuffled(PROMPTS.filter(prompt => recent.has(prompt))));
    }
    deck.push(remaining.shift()!);
  }
  return { match, round: 1, totalRounds: 5, deck, remainingPrompts: remaining, answers: {}, revealed: false, finished: false, score: 0, history: [], nextReady: [] };
}

export function normalizeAnswer(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Explicit English noun forms avoid unsafe stemming (e.g. bus -> bu, news -> new).
const regularNouns = `fork spoon knife plate cup bowl glass dish box watch brush fox
  apple banana orange pear grape peach lemon lime mango melon pineapple strawberry cherry berry
  carrot potato tomato onion pepper mushroom bean pea egg sandwich pizza burger biscuit cookie
  chip crisp pancake waffle cake sweet candy chocolate doughnut donut sausage noodle nut
  bike bicycle car bus train plane airplane aeroplane boat ship truck lorry taxi scooter
  dog cat rabbit bird fish shark whale dolphin lion tiger elephant giraffe zebra monkey
  horse cow pig sheep goat duck chicken mouse goose wolf leaf child person man woman tooth foot
  book bag pencil pen ruler eraser rubber notebook toy game ball balloon candle gift present
  guitar piano drum violin trumpet flute chair table sofa couch bed pillow blanket towel
  shoe sock boot coat jacket hat glove scarf dress shirt trouser flower tree plant seed
  star cloud mountain river beach island castle dragon robot pirate superhero instrument
  colour color flavour flavor favourite favorite theatre theater cinema movie film
  football soccer basketball tennis volleyball phone cellphone smartphone mobile television tv
  torch flashlight sweet potato ice cream school bag backpack rucksack`;

const irregularPlurals: Record<string,string> = {
  knives:'knife', mice:'mouse', geese:'goose', wolves:'wolf', leaves:'leaf',
  children:'child', people:'person', men:'man', women:'woman', teeth:'tooth', feet:'foot',
  sheep:'sheep', fish:'fish', scarves:'scarf', potatoes:'potato', tomatoes:'tomato', mangoes:'mango'
};
const nounForms = new Map<string,string>();
for (const noun of regularNouns.split(/\s+/).filter(Boolean)) {
  nounForms.set(noun,noun);
  const plural = /[^aeiou]y$/.test(noun) ? noun.slice(0,-1)+'ies'
    : /(s|x|z|ch|sh)$/.test(noun) ? noun+'es' : noun+'s';
  nounForms.set(plural,noun);
}
for (const [plural,singular] of Object.entries(irregularPlurals)) nounForms.set(plural,singular);

// Whole-answer aliases only: do not merge broader categories or guess at typos.
const equivalentGroups = [
  ['bicycle','bike'], ['colour','color'], ['flavour','flavor'],
  ['favourite','favorite'], ['theatre','theater'], ['aeroplane','airplane','plane'],
  ['sofa','couch'], ['television','tv'], ['doughnut','donut'],
  ['football','soccer'], ['lorry','truck'], ['torch','flashlight'],
  ['cinema','movie theater','movie theatre'], ['film','movie'],
  ['ice cream','icecream'], ['school bag','schoolbag'], ['backpack','rucksack']
];
const equivalents = new Map(equivalentGroups.flatMap(group => group.map(word => [word,group[0]] as const)));

export function answerMatchKey(text: string) {
  const words = normalizeAnswer(text).split(' ');
  // Pluralise the head of "X of Y" phrases; otherwise only the final noun.
  const of = words.indexOf('of');
  const nounIndex = of > 0 ? of-1 : words.length-1;
  words[nounIndex] = nounForms.get(words[nounIndex]) ?? words[nounIndex];
  const phrase = words.join(' ');
  return equivalents.get(phrase) ?? phrase;
}

export function answersMatch(a: string, b: string) {
  const key = answerMatchKey(a);
  return Boolean(key) && key === answerMatchKey(b);
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
      const matched = answersMatch(game.answers[players[0].id],game.answers[players[1].id]);
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
    if (players.every(p=>game.nextReady.includes(p.id))) Object.assign(game,createAnswerGame(game.match+1,game));
  } else throw new Error('Unknown Same Answer action.');
}

export function answerView(game: AnswerGame, id: string) {
  const {deck,answers,remainingPrompts,...publicState} = game;
  return { ...publicState, prompt:deck[game.round-1], answers:Object.fromEntries(Object.entries(answers).map(([playerId,text])=>[playerId,{
    submitted:true,...(playerId===id||game.revealed?{text}:{})
  }])) };
}
