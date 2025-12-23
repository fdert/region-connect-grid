-- Drop the existing courier update policy
DROP POLICY IF EXISTS "Couriers can update assigned orders" ON public.orders;

-- Create new policy that allows couriers to:
-- 1. Update orders already assigned to them
-- 2. Accept available orders (assign themselves to orders with null courier_id)
CREATE POLICY "Couriers can update orders" 
ON public.orders 
FOR UPDATE 
USING (
  -- Can update if already assigned to this courier
  auth.uid() = courier_id
  OR
  -- Can accept available orders (courier_id is null and order is ready/accepted)
  (
    courier_id IS NULL 
    AND status IN ('ready', 'accepted_by_merchant')
    AND has_role(auth.uid(), 'courier'::app_role)
  )
)
WITH CHECK (
  -- After update, courier_id must be the current user
  auth.uid() = courier_id
);