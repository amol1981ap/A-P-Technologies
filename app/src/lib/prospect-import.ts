import type { Prospect, ProspectStatus } from './database.types';

/** What the import writes: the same fields a prospect has, minus the ones the database fills in. */
export type ProspectRow = {
  name: string;
  organisation: string | null;
  role: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  permission: boolean;
  project_note: string | null;
  found_via: string | null;
  status: ProspectStatus;
  next_action_date: string | null;
};

export type ImportProblem = { line: number; text: string };
export type ImportPreview = { fresh: ProspectRow[]; duplicates: { line: number; name: string }[]; problems: ImportProblem[]; total: number };

export const TEMPLATE_HEADER = ['Name (person)', 'Company / department', 'Role', 'City / district', 'State', 'Phone (business)', 'Email (business)', 'Project or interest', 'Source (where you found this contact)', 'Source link', 'Permission (yes = they asked to hear from us)', 'Status (new / contacted / interested / dropped)', 'Next action date (YYYY-MM-DD)', 'Notes'];
export const TEMPLATE_CSV = [TEMPLATE_HEADER.map((h) => `"${h}"`).join(','), '"EXAMPLE - delete this row","Example Infra Pvt Ltd","Project manager","Belagavi","Karnataka","","","NH culverts and drains","Tender award notice","","","new","",""'].join('\n');

/** Splits CSV text into rows. Handles quotes, commas and line breaks inside quotes, and a leading byte-order mark. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const key = (h: string) => h.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]+/g, ' ').trim();
type FieldKey = 'name' | 'company' | 'role' | 'city' | 'state' | 'phone' | 'email' | 'project' | 'source' | 'link' | 'permission' | 'status' | 'date' | 'notes';
const ALIASES: Record<string, FieldKey> = {
  name: 'name', person: 'name', 'contact name': 'name',
  company: 'company', 'company department': 'company', organisation: 'company', organization: 'company',
  role: 'role',
  city: 'city', 'city district': 'city', location: 'city',
  state: 'state',
  phone: 'phone', mobile: 'phone', 'phone business': 'phone',
  email: 'email', 'email business': 'email',
  project: 'project', 'project or interest': 'project', interest: 'project',
  source: 'source', 'source where you found this contact': 'source',
  'source link': 'link', link: 'link',
  permission: 'permission', 'permission yes they asked to hear from us': 'permission',
  status: 'status', 'status new contacted interested dropped': 'status',
  'next action date': 'date', 'next action date yyyy mm dd': 'date', date: 'date',
  notes: 'notes', note: 'notes',
};

const STATUSES: ProspectStatus[] = ['new', 'contacted', 'interested', 'dropped'];
const blank = (s: string | undefined) => (s ?? '').trim() || null;
const digits = (s: string) => s.replace(/\D/g, '');

/** Reads the file, checks every row, and splits it into new contacts, duplicates and problems. Saves nothing. */
export function previewProspectCsv(text: string, existing: Pick<Prospect, 'name' | 'organisation' | 'phone'>[]): ImportPreview {
  const rows = parseCsv(text);
  const out: ImportPreview = { fresh: [], duplicates: [], problems: [], total: 0 };
  if (rows.length < 2) {
    out.problems.push({ line: 1, text: 'The file has no contacts. Fill in the template and try again.' });
    return out;
  }
  const col: Partial<Record<FieldKey, number>> = {};
  rows[0].forEach((h, i) => {
    const f = ALIASES[key(h)];
    if (f && col[f] === undefined) col[f] = i;
  });
  if (col.name === undefined) {
    out.problems.push({ line: 1, text: 'The first row must have a "Name" column. Use the template.' });
    return out;
  }
  const get = (r: string[], f: FieldKey) => (col[f] === undefined ? '' : (r[col[f]!] ?? '').trim());
  const seenPhone = new Set(existing.map((e) => digits(e.phone ?? '').slice(-10)).filter((d) => d.length === 10));
  const seenName = new Set(existing.map((e) => `${e.name}|${e.organisation ?? ''}`.toLowerCase()));

  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const name = get(r, 'name');
    if (/^example\b/i.test(name)) return; // the template's sample row
    out.total++;
    if (!name) return void out.problems.push({ line, text: 'No name.' });

    const rawPhone = get(r, 'phone');
    let phone: string | null = null;
    if (rawPhone) {
      const d = digits(rawPhone).replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
      if (d.length !== 10) return void out.problems.push({ line, text: `${name}: phone "${rawPhone}" is not a 10-digit number.` });
      phone = d;
    }
    const email = get(r, 'email').toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return void out.problems.push({ line, text: `${name}: email "${email}" is not valid.` });

    const statusRaw = get(r, 'status').toLowerCase();
    let status: ProspectStatus = 'new';
    if (statusRaw) {
      if (!STATUSES.includes(statusRaw as ProspectStatus)) return void out.problems.push({ line, text: `${name}: status "${statusRaw}" must be new, contacted, interested or dropped.` });
      status = statusRaw as ProspectStatus;
    }
    const dateRaw = get(r, 'date');
    if (dateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return void out.problems.push({ line, text: `${name}: date "${dateRaw}" must look like 2026-12-15.` });

    const company = blank(get(r, 'company'));
    if ((phone && seenPhone.has(phone)) || seenName.has(`${name}|${company ?? ''}`.toLowerCase())) return void out.duplicates.push({ line, name });
    if (phone) seenPhone.add(phone);
    seenName.add(`${name}|${company ?? ''}`.toLowerCase());

    const project = [get(r, 'project'), get(r, 'notes')].filter(Boolean).join(' · ');
    const source = [get(r, 'source'), get(r, 'link')].filter(Boolean).join(' ');
    out.fresh.push({
      name,
      organisation: company,
      role: blank(get(r, 'role')),
      location: [get(r, 'city'), get(r, 'state')].filter(Boolean).join(', ') || null,
      phone,
      email: email || null,
      permission: /^(yes|y|true|1)$/i.test(get(r, 'permission')),
      project_note: project || null,
      found_via: source || null,
      status,
      next_action_date: dateRaw || null,
    });
  });
  return out;
}
