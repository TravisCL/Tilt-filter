// Verifies M12 "removable checklist questions" pure logic + persistence round-trip.
// Run with: npx tsx verify_removable_questions.ts
import {
  getActiveChecklist, computeRulesHeld, buildChecklistAnswers, addDisabled, removeDisabled, sanitizeDisabled,
} from './src/utils/checklist';
import { sanitizeAppState, INITIAL_STATE } from './src/utils/initialData';
import { mergePulledIntoState } from './src/utils/supabaseSync';

let pass = 0, fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}
const rules = [
  { id: 'r1', text: 'A', checked: false },
  { id: 'r2', text: 'B', checked: false },
  { id: 'r3', text: 'C', checked: false },
];

console.log('=== 1. Nothing removed (existing users) = unchanged behaviour ===');
let c = getActiveChecklist(rules, undefined);
check('no disabled -> 3 active rules', c.activeRules.map((r) => r.id), ['r1', 'r2', 'r3']);
check('q5 enabled by default', c.q5Enabled, true);
check('all 3 + q4 + q5 yes -> held', computeRulesHeld(c.activeRules, c.q5Enabled, { r1: true, r2: true, r3: true }, true, true), true);
check('one rule NO -> not held', computeRulesHeld(c.activeRules, c.q5Enabled, { r1: true, r2: false, r3: true }, true, true), false);
check('answers all booleans', buildChecklistAnswers([], { r1: true, r2: true, r3: true }, true, true),
  { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true });

console.log('=== 2. Q4 is mandatory ===');
check('addDisabled ignores q4', addDisabled([], 'q4'), []);
check('sanitizeDisabled strips q4 + dupes', sanitizeDisabled(['q4', 'r1', 'r1', 'q5']), ['r1', 'q5']);

console.log('=== 3. Remove R2 and Q5 ===');
const d = addDisabled(addDisabled([], 'r2'), 'q5');
c = getActiveChecklist(rules, d);
check('active rules exclude r2', c.activeRules.map((r) => r.id), ['r1', 'r3']);
check('q5 disabled', c.q5Enabled, false);
check('held with only active answered (r2/q5 never answered)', computeRulesHeld(c.activeRules, c.q5Enabled, { r1: true, r3: true }, true, null), true);
check('removed question NOT counted as missed; active NO still fails', computeRulesHeld(c.activeRules, c.q5Enabled, { r1: true, r3: false }, true, null), false);
check('answers: removed = undefined, never false', buildChecklistAnswers(d, { r1: true, r3: true }, true, null),
  { rule1: true, rule2: undefined, rule3: true, q4CalculatedRisk: true, q5NotFomo: undefined });

console.log('=== 4. Remove EVERY optional question: only Q4 left, still gated by Q4 ===');
const all = ['r1', 'r2', 'r3', 'q5'].reduce((acc, id) => addDisabled(acc, id), [] as string[]);
c = getActiveChecklist(rules, all);
check('no active rules', c.activeRules.length, 0);
check('q4 YES alone -> held (no `rules.length > 0` block)', computeRulesHeld(c.activeRules, c.q5Enabled, {}, true, null), true);
check('q4 not YES -> not held', computeRulesHeld(c.activeRules, c.q5Enabled, {}, null, null), false);
check('stored rules array untouched', rules.length, 3);

console.log('=== 5. Restore ===');
check('restore r2', removeDisabled(d, 'r2'), ['q5']);
check('restore all', removeDisabled(removeDisabled(d, 'r2'), 'q5'), []);

console.log('=== 6. Persistence: local sanitize + cloud merge ===');
check('sanitize keeps disabled, drops q4', sanitizeAppState({ disabledQuestions: ['r1', 'q4', 'q5'] }).disabledQuestions, ['r1', 'q5']);
check('old local state w/o field -> []', sanitizeAppState({}).disabledQuestions, []);
check('garbage field -> []', sanitizeAppState({ disabledQuestions: 'x' }).disabledQuestions, []);
const base = { ...INITIAL_STATE, disabledQuestions: ['r1'] };
const pulled = (meta: any) => ({ accounts: [], trades: [], dailyScoreboard: [], tiltEvents: [], deskMessages: [], meta, isEmpty: false } as any);
check('pull with column null (existing user) keeps local', mergePulledIntoState(pulled({}), base).disabledQuestions, ['r1']);
check('pull [] (restored elsewhere) overwrites', mergePulledIntoState(pulled({ disabledQuestions: [] }), base).disabledQuestions, []);
check('pull [q5] from another device applies', mergePulledIntoState(pulled({ disabledQuestions: ['q5'] }), base).disabledQuestions, ['q5']);
check('removing rules does not resurrect: empty pulled rules + disabled preserved',
  mergePulledIntoState(pulled({ rules: [], disabledQuestions: ['r1'] }), base).disabledQuestions, ['r1']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
