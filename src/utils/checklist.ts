import type { RuleItem } from '../types';

/** Q4 (Risk) is mandatory and can never be removed. */
export const MANDATORY_QUESTION_ID = 'q4';

export function sanitizeDisabled(ids: string[] | undefined | null): string[] {
  return Array.from(new Set((ids ?? []).filter((id) => typeof id === 'string' && id !== MANDATORY_QUESTION_ID)));
}

export function getActiveChecklist(rules: RuleItem[], disabledIds: string[] | undefined | null) {
  const disabledQuestions = sanitizeDisabled(disabledIds);
  return {
    disabledQuestions,
    activeRules: rules.filter((r) => !disabledQuestions.includes(r.id)),
    q5Enabled: !disabledQuestions.includes('q5'),
  };
}

export function addDisabled(current: string[] | undefined | null, id: string): string[] {
  return sanitizeDisabled([...(current ?? []), id]);
}

export function removeDisabled(current: string[] | undefined | null, id: string): string[] {
  return sanitizeDisabled(current).filter((x) => x !== id);
}

/** Rules-held = every ACTIVE question answered YES. Removed questions are ignored (not "missed"). */
export function computeRulesHeld(
  activeRules: RuleItem[],
  q5Enabled: boolean,
  ruleCheckboxes: Record<string, boolean | null | undefined>,
  q4Risk: boolean | null,
  q5NotFomo: boolean | null
): boolean {
  return (
    activeRules.every((r) => ruleCheckboxes[r.id] === true) &&
    q4Risk === true &&
    (!q5Enabled || q5NotFomo === true)
  );
}

/** Removed questions are `undefined` (never `false`) so downstream stats can't read them as missed. */
export function buildChecklistAnswers(
  disabledIds: string[],
  ruleCheckboxes: Record<string, boolean | null | undefined>,
  q4Risk: boolean | null,
  q5NotFomo: boolean | null
) {
  const rule = (id: string) => (disabledIds.includes(id) ? undefined : !!ruleCheckboxes[id]);
  return {
    rule1: rule('r1'),
    rule2: rule('r2'),
    rule3: rule('r3'),
    q4CalculatedRisk: q4Risk === true,
    q5NotFomo: disabledIds.includes('q5') ? undefined : q5NotFomo === true,
  };
}
