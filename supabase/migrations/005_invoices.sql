-- ═══════════════════════════════════════════════════════════
-- 005_invoices.sql
-- Invoices and line items
-- Run AFTER 003_client_portal.sql
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- TABLE: invoices
-- ─────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  invoice_number text not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'paid', 'overdue', 'cancelled', 'draft')),
  currency       text not null default 'USD',
  amount_total   numeric(12,2) not null default 0,
  issue_date     date not null default current_date,
  due_date       date,
  paid_at        timestamptz,
  pdf_url        text,
  notes          text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.invoices enable row level security;

-- Admins full access
create policy "Admins can manage invoices"
  on public.invoices for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- owner + accountant can read invoices
create policy "Members can read invoices"
  on public.invoices for select
  using (
    exists (
      select 1 from public.client_members cm
      where cm.client_id = invoices.client_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('owner', 'accountant')
    )
  );

-- ─────────────────────────────────────────────────────────
-- TABLE: invoice_line_items
-- ─────────────────────────────────────────────────────────
create table if not exists public.invoice_line_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null,
  amount      numeric(12,2) generated always as (quantity * unit_price) stored,
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

alter table public.invoice_line_items enable row level security;

-- Admins full access
create policy "Admins can manage line items"
  on public.invoice_line_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- owner + accountant can read line items (via invoice → client membership)
create policy "Members can read line items"
  on public.invoice_line_items for select
  using (
    exists (
      select 1 from public.invoices inv
      join public.client_members cm on cm.client_id = inv.client_id
      where inv.id = invoice_line_items.invoice_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('owner', 'accountant')
    )
  );

-- ─────────────────────────────────────────────────────────
-- TRIGGER: recalculate invoice total on line item changes
-- ─────────────────────────────────────────────────────────
create or replace function public.recalculate_invoice_total()
returns trigger as $$
begin
  update public.invoices
  set
    amount_total = (
      select coalesce(sum(quantity * unit_price), 0)
      from public.invoice_line_items
      where invoice_id = coalesce(new.invoice_id, old.invoice_id)
    ),
    updated_at = now()
  where id = coalesce(new.invoice_id, old.invoice_id);
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists on_line_item_change on public.invoice_line_items;
create trigger on_line_item_change
  after insert or update or delete on public.invoice_line_items
  for each row execute function public.recalculate_invoice_total();
