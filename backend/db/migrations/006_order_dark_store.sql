ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dark_store_id UUID REFERENCES public.dark_stores(id);

CREATE INDEX IF NOT EXISTS idx_orders_store_date_slot
  ON public.orders (dark_store_id, delivery_date, slot)
  WHERE status = 'SCHEDULED';

UPDATE public.orders o
SET dark_store_id = a.dark_store_id
FROM public.addresses a
WHERE a.id = o.address_id
  AND o.dark_store_id IS NULL
  AND a.dark_store_id IS NOT NULL;
