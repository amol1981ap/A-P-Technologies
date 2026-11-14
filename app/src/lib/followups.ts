import { daysSince } from './calc';
import type { Quote } from './database.types';

/** Follow-up nudges go out on these days after a quote is sent. */
export const FOLLOWUP_DAYS = [3, 7, 12] as const;
/** The usual decision window is 10–15 days; past this a quote turns red. */
export const COLD_AFTER_DAYS = 15;

export type FollowUpState = {
  age: number;
  /** Index (0–2) of the next nudge, or null once all three are done. */
  nextIndex: number | null;
  nextDay: number | null;
  due: boolean;
  pastCycle: boolean;
};

export function followUpState(q: Pick<Quote, 'status' | 'sent_at' | 'followups_done'>): FollowUpState | null {
  if (q.status !== 'sent' || !q.sent_at) return null;
  const age = daysSince(q.sent_at);
  const idx = q.followups_done < FOLLOWUP_DAYS.length ? q.followups_done : null;
  const nextDay = idx == null ? null : FOLLOWUP_DAYS[idx];
  return { age, nextIndex: idx, nextDay, due: nextDay != null && age >= nextDay, pastCycle: age > COLD_AFTER_DAYS };
}

export function followUpMessage(opts: { index: number; customer: string; number: string; validUntil: string | null; company: string }) {
  const hi = `Hello ${opts.customer},`;
  const sign = `— ${opts.company}`;
  if (opts.index === 0) {
    return `${hi} hope you received our quotation ${opts.number} for GFRP rebars. Happy to answer any questions or share test certificates. ${sign}`;
  }
  if (opts.index === 1) {
    return `${hi} following up on quotation ${opts.number}. If the specification or quantity has changed, we can revise it quickly. ${sign}`;
  }
  const valid = opts.validUntil ? ` It is valid until ${new Date(opts.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.` : '';
  return `${hi} quotation ${opts.number} is still open.${valid} Please let us know if you would like to proceed or need any changes. ${sign}`;
}
