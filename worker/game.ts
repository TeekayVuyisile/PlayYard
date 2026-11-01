export type Player = { id: string; name: string; secret?: number };
export type Guess = { player: string; value: number; result: 'higher' | 'lower' | 'correct' };
export type State = {
  code: string; min: number; max: number; players: Player[]; turn: number;
  guesses: Guess[]; winner?: string; messages: { name: string; text: string }[];
};
export function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
export function act(s: State, id: string, action: Record<string, unknown>) {
  const index = s.players.findIndex(p => p.id === id);
  if (index < 0) throw new Error('Join this room first.');
  const p = s.players[index];
  if (action.type === 'secret') {
    if (p.secret !== undefined || s.winner) throw new Error('Your number is already locked in.');
    if (!integer(action.value, s.min, s.max)) throw new Error('Choose a whole number within the range.');
    p.secret = action.value;
  } else if (action.type === 'guess') {
    if (s.players.length !== 2 || s.players.some(p => p.secret === undefined)) throw new Error('Wait for both players to lock in.');
    if (s.winner) throw new Error('This round has ended.');
    if (s.turn !== index) throw new Error('Wait for your turn.');
    if (!integer(action.value, s.min, s.max)) throw new Error('Your guess must be within the range.');
    const secret = s.players[1-index].secret!;
    const result = action.value === secret ? 'correct' : action.value < secret ? 'higher' : 'lower';
    s.guesses.push({ player: p.name, value: action.value, result });
    if (result === 'correct') s.winner = p.id;
    else s.turn = 1-index;
  } else if (action.type === 'chat') {
    if (typeof action.text !== 'string' || !action.text.trim() || action.text.length > 240) throw new Error('Messages must be 1–240 characters.');
    s.messages.push({ name: p.name, text: action.text.trim() });
    s.messages = s.messages.slice(-50);
  } else if (action.type === 'rematch') {
    if (!s.winner) throw new Error('Finish this round first.');
    s.players.forEach(p => { delete p.secret; });
    delete s.winner; s.guesses = []; s.turn = 1-s.turn;
  } else throw new Error('Unknown action.');
}
export function view(s: State, id: string) {
  return { ...s, players: s.players.map(p => ({ id: p.id, name: p.name, ready: p.secret !== undefined, ...(p.id === id ? { secret: p.secret } : {}) })) };
}
