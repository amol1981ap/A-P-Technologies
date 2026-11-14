-- Separate registered office and works (factory) addresses for quotations and invoices.
alter table public.company_settings
  add column office_address text,
  add column works_address text;
