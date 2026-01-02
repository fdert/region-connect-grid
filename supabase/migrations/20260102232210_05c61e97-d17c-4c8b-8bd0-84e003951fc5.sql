-- Allow anyone to view orders for review purposes (public review page)
CREATE POLICY "Anyone can view orders for review" 
ON public.orders 
FOR SELECT 
USING (true);

-- Also allow anyone to view stores for the review page
CREATE POLICY "Anyone can view stores" 
ON public.stores 
FOR SELECT 
USING (true);

-- Allow anyone to submit store reviews (for public review page)
CREATE POLICY "Anyone can insert store reviews" 
ON public.store_reviews 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to read store reviews
CREATE POLICY "Anyone can read store reviews" 
ON public.store_reviews 
FOR SELECT 
USING (true);

-- Allow anyone to insert courier reviews (for public review page)
CREATE POLICY "Anyone can insert courier reviews" 
ON public.courier_reviews 
FOR INSERT 
WITH CHECK (true);