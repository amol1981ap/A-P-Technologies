/**
 * Database types for the tables the app uses so far (Phase 0).
 * Matches supabase/migrations. Regenerate the full file with
 * `npx supabase gen types typescript --project-id bdghrsdaueqvnvsgtxmy` when more tables are used.
 */

type Table<Row, Insert, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type AppRole = 'owner' | 'sales' | 'despatch' | 'factory';
export type PartyType = 'customer' | 'consultant' | 'supplier' | 'transporter';
export type RebarSurface = 'sand_coated' | 'ribbed';

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
  city: string | null;
  state: string | null;
  state_code: string | null;
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
  standard_length_m: number;
  hsn_code: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Rate = {
  id: string;
  product_id: string;
  rate_per_m: number;
  gst_percent: number | null;
  effective_from: string;
  set_by: string | null;
  created_at: string;
};

export type CurrentRate = {
  product_id: string | null;
  rate_per_m: number | null;
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

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }>;
      company_settings: Table<CompanySettings, Partial<CompanySettings>>;
      products: Table<Product, Pick<Product, 'diameter_mm'> & Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>>;
      rates: Table<Rate, Pick<Rate, 'product_id' | 'rate_per_m'> & Partial<Pick<Rate, 'gst_percent' | 'effective_from'>>>;
      parties: Table<Party, Pick<Party, 'name'> & Partial<Omit<Party, 'id' | 'created_at' | 'updated_at' | 'created_by'>>>;
    };
    Views: {
      current_rates: { Row: CurrentRate; Relationships: [] };
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
