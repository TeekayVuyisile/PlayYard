import { imposterAction, imposterView, type ImposterGame } from './imposter';
import { chessAction, chessView, type ChessGame } from './chess';
import { answerAction, answerView, type AnswerGame } from './same-answer';
export type Player = { id: string; name: string; secret?: number };
export type Guess = { player: string; value: number; result: 'higher' | 'lower' | 'correct' };
export type TimerAttempt = { startedAt: number; elapsedMs?: number };
export type TimerRound = {
  targetMs: number; hidden: boolean; round: number;
  attempts: Record<string, TimerAttempt>; finished: boolean; draw?: boolean;
};
export type State = {
  code: string; min: number; max: number; players: Player[]; turn: number;
  guesses: Guess[]; winner?: string; messages: { name: string; text: string }[];
  game?: 'number' | 'timer' | 'answer' | 'imposter' | 'chess'; timer?: TimerRound; sameAnswer?: AnswerGame; imposter?: ImposterGame; chess?: ChessGame;
};
export function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
export function act(s: State, id: string, action: Record<string, unknown>, now = Date.now()) {
  const index = s.players.findIndex(p => p.id === id);
  if (index < 0) throw new Error('Join this room first.');
  const p = s.players[index];
  if (action.type !== 'chat' && s.game === 'imposter') {
    imposterAction(s.imposter!,s.players,id,action,now); return;
  }
  if (action.type !== 'chat' && s.game === 'chess') {
    chessAction(s.chess!,s.players,id,action); return;
  }
  if (typeof action.type === 'string' && action.type.startsWith('timer-') && s.game !== 'timer') throw new Error('Timer actions require a Stop the Clock room, not Guess My Number or Same Answer.');
  if ((action.type === 'secret' || action.type === 'guess') && s.game && s.game !== 'number') throw new Error(`This room is playing ${s.game === 'timer' ? 'Stop the Clock' : 'Same Answer'}.`);
  if (typeof action.type === 'string' && action.type.startsWith('answer-') && s.game !== 'answer') throw new Error('Answer actions require a Same Answer room.');
  if (s.game === 'answer' && (action.type === 'answer-submit' || action.type === 'answer-next' || action.type === 'rematch')) {
    answerAction(s.sameAnswer!,s.players,id,action);
    return;
  }
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
  } else if (action.type === 'timer-start' || action.type === 'timer-stop' || action.type === 'timer-reset') {
    const t = s.timer!;
    if (action.round !== t.round) throw new Error('That round has ended. Refresh your game.');
    if (t.finished) throw new Error('This round has ended.');
    if (s.players.length !== 2) throw new Error('Wait for your friend to join.');
    const attempt = t.attempts[id];
    if (action.type === 'timer-start') {
      if (attempt) throw new Error('Your timer has already started.');
      t.attempts[id] = { startedAt: now };
    } else if (action.type === 'timer-reset') {
      if (!attempt || attempt.elapsedMs !== undefined) throw new Error('A submitted result cannot be changed.');
      delete t.attempts[id];
    } else {
      if (!attempt) throw new Error('Start your timer first.');
      if (attempt.elapsedMs !== undefined) throw new Error('Your result is already locked in.');
      if (!integer(action.elapsedMs, 0, 60000)) throw new Error('Invalid elapsed time.');
      // Local timing avoids scoring network latency. This bounds implausible
      // submissions; it cannot prove that an untrusted browser reported honestly.
      if (Math.abs(now - attempt.startedAt - action.elapsedMs) > 2000) throw new Error('Your timer lost sync. Reset this attempt and try again.');
      attempt.elapsedMs = action.elapsedMs;
      if (s.players.every(player => t.attempts[player.id]?.elapsedMs !== undefined)) {
        t.finished = true;
        const [a, b] = s.players;
        const da = Math.abs(t.attempts[a.id].elapsedMs! - t.targetMs);
        const db = Math.abs(t.attempts[b.id].elapsedMs! - t.targetMs);
        if (da === db) t.draw = true;
        else s.winner = da < db ? a.id : b.id;
      }
    }
  } else if (action.type === 'chat') {
    if (typeof action.text !== 'string' || !action.text.trim() || action.text.length > 240) throw new Error('Messages must be 1–240 characters.');
    s.messages.push({ name: p.name, text: action.text.trim() });
    s.messages = s.messages.slice(-50);
  } else if (action.type === 'rematch') {
    if (s.game === 'timer') {
      if (!s.timer?.finished) throw new Error('Finish this round first.');
      if (action.round !== s.timer.round) throw new Error('That round has ended.');
      s.timer = { ...s.timer, round: s.timer.round + 1, attempts: {}, finished: false, draw: undefined };
      delete s.winner;
      return;
    }
    if (!s.winner) throw new Error('Finish this round first.');
    s.players.forEach(p => { delete p.secret; });
    delete s.winner; s.guesses = []; s.turn = 1-s.turn;
  } else throw new Error('Unknown action.');
}
export function view(s: State, id: string) {
  const timer = s.timer ? {
    targetMs: s.timer.targetMs, hidden: s.timer.hidden, round: s.timer.round,
    finished: s.timer.finished, draw: s.timer.draw,
    attempts: Object.fromEntries(Object.entries(s.timer.attempts).map(([playerId, attempt]) => [playerId, {
      started: true, submitted: attempt.elapsedMs !== undefined,
      ...(playerId === id || s.timer!.finished ? { elapsedMs: attempt.elapsedMs } : {})
    }]))
  } : undefined;
  return { ...s, timer, imposter:s.imposter?imposterView(s.imposter,id):undefined, chess:s.chess?chessView(s.chess):undefined, sameAnswer:s.sameAnswer?answerView(s.sameAnswer,id):undefined, players: s.players.map(p => ({ id: p.id, name: p.name, ready: s.game === 'answer' ? Object.hasOwn(s.sameAnswer!.answers,p.id) : s.game === 'timer' ? s.timer?.attempts[p.id]?.elapsedMs !== undefined : p.secret !== undefined, ...(p.id === id ? { secret: p.secret } : {}) })) };
}
