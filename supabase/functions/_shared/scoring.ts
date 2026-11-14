/**
 * Rule-based lead score. Keep in sync with app/src/lib/scoring.ts.
 * Hot: a buyer type with a project, a place and a quantity. Cold: students, researchers, no real project.
 */
export type Score = 'hot' | 'warm' | 'cold';

const BUYER_ROLES = ['contractor', 'developer', 'builder', 'consultant', 'engineer', 'government', 'dealer'];
const NOISE = /\b(student|college|thesis|research|report|assignment|free sample|job|internship)\b/i;

export function scoreLead(l: {
  buyer_role?: string | null;
  project_type?: string | null;
  location?: string | null;
  quantity_note?: string | null;
  notes?: string | null;
}): Score {
  const text = [l.buyer_role, l.project_type, l.quantity_note, l.notes].filter(Boolean).join(' ');
  if (NOISE.test(text)) return 'cold';
  const role = (l.buyer_role ?? '').toLowerCase();
  const buyer = BUYER_ROLES.some((r) => role.includes(r));
  const hasProject = !!l.project_type?.trim();
  const hasPlace = !!l.location?.trim();
  const hasQty = !!l.quantity_note?.trim();
  if (buyer && hasProject && hasPlace && hasQty) return 'hot';
  if (!buyer && !hasQty) return 'cold';
  return 'warm';
}
