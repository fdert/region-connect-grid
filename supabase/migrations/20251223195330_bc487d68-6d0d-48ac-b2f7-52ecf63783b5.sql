-- Allow couriers to view available orders (orders without courier assigned that are ready or accepted)
CREATE POLICY "Couriers can view available orders" 
ON public.orders 
FOR SELECT 
USING (
  courier_id IS NULL 
  AND status IN ('ready', 'accepted_by_merchant')
  AND has_role(auth.uid(), 'courier'::app_role)
);