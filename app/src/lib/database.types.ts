/**
 * Database types for the tables the app uses so far (Phase 0).
 * Matches supabase/migrations. Regenerate the full file with
 * `npx supabase gen types typescript --project-id bdghrsdaueqvnvsgtxmy` when more tables are used.
 */

type Table<Row, Insert, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type AppRole = 'owner' | 'sales' | 'despatch' | 'factory';
export type PartyType = 'customer' | 'consultant' | 'supplier' | 'transporter';
export type RebarSurface = 'sand_coated' | 'ribbed';
export type RebarShape = 'straight' | 'bent_up';
export type LeadSource = 'instagram' | 'facebook' | 'whatsapp' | 'website' | 'indiamart' | 'referral' | 'phone' | 'walk_in' | 'other';
export type LeadScore = 'hot' | 'warm' | 'cold';
export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type OrderStage = 'new' | 'in_production' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
export type DespatchStatus = 'pending' | 'loaded' | 'delivered';

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanySettings = {
  id: number;
  name: string;
  gstin: string | null;
  address: string | null;
  office_address: string | null;
  works_address: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  overhead_per_m: number;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  quote_terms: string | null;
  updated_at: string;
};

export type Product = {
  id: string;
  diameter_mm: number;
  surface: RebarSurface;
  shape: RebarShape;
  standard_length_m: number;
  hsn_code: string | null;
  kg_per_m: number;
  reorder_level_m: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Rate = {
  id: string;
  product_id: string;
  rate_per_kg: number;
  gst_percent: number | null;
  effective_from: string;
  set_by: string | null;
  created_at: string;
};

export type CurrentRate = {
  product_id: string | null;
  rate_per_kg: number | null;
  gst_percent: number | null;
  effective_from: string | null;
};

export type Party = {
  id: string;
  type: PartyType;
  name: string;
  contact_person: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  party_id: string | null;
  contact_name: string;
  company: string | null;
  phone: string | null;
  buyer_role: string | null;
  project_type: string | null;
  location: string | null;
  quantity_note: string | null;
  source: LeadSource;
  score: LeadScore | null;
  status: LeadStatus;
  assigned_to: string | null;
  next_follow_up: string | null;
  notes: string | null;
  campaign: string | null;
  influencer_id: string | null;
  lost_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: string;
  number: string;
  lead_id: string | null;
  party_id: string | null;
  status: QuoteStatus;
  valid_until: string | null;
  terms: string | null;
  notes: string | null;
  sent_at: string | null;
  followups_done: number;
  closed_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteItem = {
  id: string;
  quote_id: string;
  product_id: string;
  metres: number;
  rate_per_kg: number | null;
  kg_per_m: number | null;
  gst_percent: number | null;
};

export type Order = {
  id: string;
  number: string;
  quote_id: string | null;
  party_id: string;
  po_number: string | null;
  site_address: string | null;
  stage: OrderStage;
  due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  metres: number;
  rate_per_kg: number | null;
  kg_per_m: number | null;
  gst_percent: number | null;
};

export type Despatch = {
  id: string;
  number: string;
  order_id: string;
  assigned_to: string | null;
  status: DespatchStatus;
  vehicle_no: string | null;
  batch_numbers: string[];
  proof_path: string | null;
  delivered_at: string | null;
  released_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DespatchItem = { id: string; despatch_id: string; product_id: string; metres: number; batch_no: string | null };

export type ProductionEntry = {
  id: string;
  entry_date: string;
  product_id: string;
  batch_no: string;
  good_m: number;
  scrap_m: number;
  resin_kg: number | null;
  roving_kg: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RawMaterial = { id: string; name: string; unit: string; sort: number };
export type RawMaterialMovement = {
  id: string;
  material_id: string;
  qty: number;
  kind: 'receipt' | 'usage' | 'adjustment';
  movement_date: string;
  production_entry_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};
export type FinishedStock = { product_id: string | null; produced_m: number | null; despatched_m: number | null; on_hand_m: number | null; reorder_level_m: number | null };
export type RawMaterialStock = { material_id: string | null; name: string | null; unit: string | null; sort: number | null; on_hand: number | null; avg_daily_use: number | null };

export type ProspectStatus = 'new' | 'contacted' | 'interested' | 'converted' | 'dropped';
export type Prospect = {
  id: string;
  name: string;
  organisation: string | null;
  role: string | null;
  location: string | null;
  phone: string | null;
  project_note: string | null;
  found_via: string | null;
  status: ProspectStatus;
  next_action_date: string | null;
  last_contacted: string | null;
  lead_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type MarketingSpend = { id: string; month: string; source: LeadSource; amount: number; note: string | null; created_by: string | null; created_at: string };
export type LeadPerformance = {
  lead_id: string | null;
  source: LeadSource | null;
  campaign: string | null;
  influencer_id: string | null;
  score: LeadScore | null;
  status: LeadStatus | null;
  created_at: string | null;
  quoted: boolean | null;
  ordered: boolean | null;
  order_value: number | null;
};

export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';
export type PaymentMode = 'bank_transfer' | 'upi' | 'cheque' | 'cash' | 'other';
export type Invoice = {
  id: string;
  number: string | null;
  order_id: string | null;
  despatch_id: string | null;
  party_id: string;
  invoice_date: string;
  due_date: string | null;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  round_off: number;
  total: number;
  status: InvoiceStatus;
  place_of_supply: string | null;
  is_interstate: boolean;
  eway_bill_no: string | null;
  terms_days: number;
  last_reminder_at: string | null;
  reminders_sent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type InvoiceItem = {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  hsn_code: string | null;
  metres: number;
  kg_per_m: number;
  kg: number;
  rate_per_kg: number;
  gst_percent: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
};
export type Payment = {
  id: string;
  invoice_id: string | null;
  party_id: string;
  amount: number;
  received_on: string;
  mode: PaymentMode;
  reference: string | null;
  recorded_by: string | null;
  created_at: string;
};
export type InvoiceBalance = {
  invoice_id: string | null;
  party_id: string | null;
  status: InvoiceStatus | null;
  total: number | null;
  due_date: string | null;
  paid: number | null;
  balance: number | null;
  days_overdue: number | null;
};

export type PoStatus = 'ordered' | 'received' | 'cancelled';
export type PurchaseOrder = {
  id: string;
  number: string;
  supplier_id: string;
  status: PoStatus;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  received_on: string | null;
  supplier_bill_no: string | null;
  supplier_bill_date: string | null;
  is_interstate: boolean;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paid_on: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type PurchaseOrderItem = { id: string; po_id: string; material_id: string; qty: number; rate: number; gst_percent: number };
export type MaterialCost = { material_id: string | null; qty_received: number | null; avg_rate: number | null };
export type BatchTest = { id: string; batch_no: string; tested_on: string; lab: string | null; report_no: string | null; notes: string | null; created_by: string | null; created_at: string };
export type BatchTestValue = { id: string; test_id: string; property: string; value: string; unit: string | null; requirement: string | null; sort: number };
export type TaskStatus = 'open' | 'done';
export type Task = {
  id: string;
  title: string;
  detail: string | null;
  assigned_to: string;
  due_date: string | null;
  status: TaskStatus;
  done_at: string | null;
  proof_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }>;
      company_settings: Table<CompanySettings, Partial<CompanySettings>>;
      products: Table<Product, Pick<Product, 'diameter_mm'> & Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>>;
      rates: Table<Rate, Pick<Rate, 'product_id' | 'rate_per_kg'> & Partial<Pick<Rate, 'gst_percent' | 'effective_from'>>>;
      leads: Table<Lead, Pick<Lead, 'contact_name'> & Partial<Omit<Lead, 'id' | 'contact_name' | 'created_at' | 'updated_at' | 'created_by'>>>;
      quotes: Table<Quote, Partial<Omit<Quote, 'id' | 'number' | 'created_at' | 'updated_at' | 'created_by'>>>;
      quote_items: Table<QuoteItem, Pick<QuoteItem, 'quote_id' | 'product_id' | 'metres'> & Partial<Pick<QuoteItem, 'rate_per_kg' | 'kg_per_m' | 'gst_percent'>>>;
      orders: Table<Order, Pick<Order, 'party_id'> & Partial<Omit<Order, 'id' | 'number' | 'party_id' | 'created_at' | 'updated_at' | 'created_by'>>>;
      order_items: Table<OrderItem, Pick<OrderItem, 'order_id' | 'product_id' | 'metres'> & Partial<Pick<OrderItem, 'rate_per_kg' | 'kg_per_m' | 'gst_percent'>>>;
      despatches: Table<Despatch, Pick<Despatch, 'order_id'> & Partial<Omit<Despatch, 'id' | 'number' | 'order_id' | 'created_at' | 'updated_at'>>>;
      despatch_items: Table<DespatchItem, Pick<DespatchItem, 'despatch_id' | 'product_id' | 'metres'> & Partial<Pick<DespatchItem, 'batch_no'>>>;
      production_entries: Table<ProductionEntry, Pick<ProductionEntry, 'product_id' | 'good_m'> & Partial<Omit<ProductionEntry, 'id' | 'product_id' | 'good_m' | 'batch_no' | 'created_at' | 'updated_at' | 'created_by'>>>;
      raw_materials: Table<RawMaterial, Partial<RawMaterial>>;
      raw_material_movements: Table<RawMaterialMovement, Pick<RawMaterialMovement, 'material_id' | 'qty' | 'kind'> & Partial<Pick<RawMaterialMovement, 'movement_date' | 'note'>>>;
      marketing_spend: Table<MarketingSpend, Pick<MarketingSpend, 'month' | 'source' | 'amount'> & Partial<Pick<MarketingSpend, 'note'>>>;
      prospects: Table<Prospect, Pick<Prospect, 'name'> & Partial<Omit<Prospect, 'id' | 'name' | 'created_at' | 'updated_at' | 'created_by'>>>;
      invoices: Table<Invoice, Pick<Invoice, 'party_id'> & Partial<Omit<Invoice, 'id' | 'party_id' | 'number' | 'created_at' | 'updated_at'>>>;
      invoice_items: Table<InvoiceItem, Omit<InvoiceItem, 'id'>>;
      payments: Table<Payment, Pick<Payment, 'party_id' | 'amount'> & Partial<Pick<Payment, 'invoice_id' | 'received_on' | 'mode' | 'reference'>>>;
      purchase_orders: Table<PurchaseOrder, Pick<PurchaseOrder, 'supplier_id'> & Partial<Omit<PurchaseOrder, 'id' | 'number' | 'supplier_id' | 'created_at' | 'updated_at' | 'created_by'>>>;
      purchase_order_items: Table<PurchaseOrderItem, Omit<PurchaseOrderItem, 'id'>>;
      batch_tests: Table<BatchTest, Pick<BatchTest, 'batch_no'> & Partial<Omit<BatchTest, 'id' | 'batch_no' | 'created_at' | 'created_by'>>>;
      batch_test_values: Table<BatchTestValue, Omit<BatchTestValue, 'id'>>;
      tasks: Table<Task, Pick<Task, 'title' | 'assigned_to'> & Partial<Omit<Task, 'id' | 'title' | 'assigned_to' | 'created_at' | 'updated_at' | 'created_by'>>>;
      parties: Table<Party, Pick<Party, 'name'> & Partial<Omit<Party, 'id' | 'created_at' | 'updated_at' | 'created_by'>>>;
    };
    Views: {
      current_rates: { Row: CurrentRate; Relationships: [] };
      finished_stock: { Row: FinishedStock; Relationships: [] };
      lead_performance: { Row: LeadPerformance; Relationships: [] };
      invoice_balances: { Row: InvoiceBalance; Relationships: [] };
      material_cost: { Row: MaterialCost; Relationships: [] };
      raw_material_stock: { Row: RawMaterialStock; Relationships: [] };
    };
    Functions: { [_ in never]: never };
    Enums: {
      app_role: AppRole;
      party_type: PartyType;
      rebar_surface: RebarSurface;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
