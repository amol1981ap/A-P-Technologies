/**
 * Sample data for screens whose live data arrives in later phases (Leads/Quotes: Phase 1, Orders/Factory: Phase 2, Money: Phase 4).
 * Shapes here are the starting point for the real database tables.
 */
import type { Tone } from '@/components/ui';

export type Surface = 'Sand-coated' | 'Ribbed';
export type LeadScore = 'Hot' | 'Warm' | 'Cold';
export type OrderStage = 'New' | 'In production' | 'Ready' | 'Dispatched' | 'Delivered';

export type NeedsYouItem = { id: string; title: string; detail: string; action: string; tone: Tone };
export type Lead = { id: string; name: string; detail: string; score: LeadScore; source: string; next: string };
export type Order = {
  id: string;
  customer: string;
  place: string;
  diameterMm: number;
  surface: Surface;
  metres: number;
  valueLakh: number;
  stage: OrderStage;
  payment: 'Paid' | 'Advance' | 'Overdue';
};
export type StockLine = { diameterMm: number; metres: number; capacity: number; reorderAt: number };
export type RawMaterial = { name: string; stock: string; perDay: string; daysLeft: number };
export type Due = { party: string; days: number; amountLakh: number };

export const month = { salesLakh: 3.0, targetLakh: 5.0, vsLastMonthPct: 15, leads: 9, hotLeads: 4, quotes: 6, quotesWaitingRate: 2, bakayaLakh: 2.4, oldestDueDays: 41 };

export const needsYou: NeedsYouItem[] = [
  { id: 'n1', title: 'Add your rate', detail: 'Shree Constructions · 12 mm · 8,000 m', action: 'Rate', tone: 'calm' },
  { id: 'n2', title: 'Payment reminder', detail: 'Patil Infra · ₹1.8 L · 41 days', action: 'Send', tone: 'attention' },
  { id: 'n3', title: 'Release despatch D-031', detail: 'PO matched · batch 2611-A ready', action: 'Open', tone: 'calm' },
];

export const followUps = [
  { id: 'f1', name: 'Sai Developers', day: 'Day 3' },
  { id: 'f2', name: 'Konkan Warehousing', day: 'Day 7' },
];

export const leads: Lead[] = [
  { id: 'l1', name: 'Shree Constructions', detail: 'Contractor · warehouse trimix floor · Chiplun', score: 'Hot', source: 'Instagram ad · 2 h ago', next: 'Quote drafted' },
  { id: 'l2', name: 'Om Precast', detail: 'Precast drains · Satara', score: 'Hot', source: 'Website · today', next: 'Reply ready' },
  { id: 'l3', name: 'Coastal Infra Projects', detail: 'EPC · NH culverts · Ratnagiri', score: 'Warm', source: 'Referral · yesterday', next: 'Call consultant' },
  { id: 'l4', name: 'R. Kulkarni', detail: 'Student · project report', score: 'Cold', source: 'Meta lead form', next: 'Polite reply sent' },
];

export const orders: Order[] = [
  { id: 'SO-0058', customer: 'Coastal drain package', place: 'Ratnagiri', diameterMm: 12, surface: 'Sand-coated', metres: 8000, valueLakh: 1.4, stage: 'Ready', payment: 'Advance' },
  { id: 'SO-0057', customer: 'Sai Developers', place: 'Chiplun', diameterMm: 10, surface: 'Ribbed', metres: 5500, valueLakh: 0.92, stage: 'In production', payment: 'Advance' },
  { id: 'SO-0056', customer: 'Shree Constructions', place: 'Khed', diameterMm: 12, surface: 'Sand-coated', metres: 6000, valueLakh: 1.05, stage: 'New', payment: 'Advance' },
  { id: 'SO-0055', customer: 'Konkan Warehousing', place: 'Dapoli', diameterMm: 8, surface: 'Sand-coated', metres: 3000, valueLakh: 0.52, stage: 'Dispatched', payment: 'Paid' },
  { id: 'SO-0054', customer: 'Patil Infra', place: 'Kolhapur', diameterMm: 16, surface: 'Sand-coated', metres: 4200, valueLakh: 1.8, stage: 'Delivered', payment: 'Overdue' },
];

export const stages: OrderStage[] = ['New', 'In production', 'Ready', 'Dispatched', 'Delivered'];

export const factoryToday = { producedM: 2400, batch: '2611-A', monthM: 28300, planM: 50000, scrapPct: 1.2, resinDaysLeft: 6 };

export const stock: StockLine[] = [
  { diameterMm: 8, metres: 9500, capacity: 14000, reorderAt: 5000 },
  { diameterMm: 10, metres: 6200, capacity: 12000, reorderAt: 4800 },
  { diameterMm: 12, metres: 3100, capacity: 14000, reorderAt: 6300 },
  { diameterMm: 16, metres: 5800, capacity: 12000, reorderAt: 3600 },
  { diameterMm: 20, metres: 1200, capacity: 10000, reorderAt: 2000 },
];

export const rawMaterials: RawMaterial[] = [
  { name: 'Glass fibre roving', stock: '5,400 kg', perDay: '450 kg', daysLeft: 12 },
  { name: 'Resin', stock: '710 kg', perDay: '118 kg', daysLeft: 6 },
  { name: 'Hardener', stock: '95 kg', perDay: '9 kg', daysLeft: 10 },
  { name: 'Silica sand', stock: '1,800 kg', perDay: '120 kg', daysLeft: 15 },
];

export const dues: Due[] = [
  { party: 'Patil Infra', days: 41, amountLakh: 1.8 },
  { party: 'Sai Developers', days: 18, amountLakh: 0.4 },
  { party: 'Konkan Warehousing', days: 6, amountLakh: 0.2 },
];

/** Raw material or invoice older than this needs attention. */
export const RESIN_ALERT_DAYS = 7;
export const OVERDUE_DAYS = 30;

export const formatMetres = (m: number) => `${m.toLocaleString('en-IN')} m`;
export const formatLakh = (l: number) => `₹${l.toFixed(l < 1 ? 2 : 1)} L`;
