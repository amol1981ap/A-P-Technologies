alter table public.prospects
  add column email text check (email is null or position('@' in email) > 1),
  add column permission boolean not null default false;
comment on column public.prospects.permission is 'True when the contact asked to hear from us. Blank or false means a first, personal contact only.';
