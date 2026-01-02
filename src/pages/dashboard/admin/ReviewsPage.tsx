import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Store, Truck, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const ReviewsPage = () => {
  const [activeTab, setActiveTab] = useState("store");

  // Fetch store reviews
  const { data: storeReviews, isLoading: loadingStoreReviews } = useQuery({
    queryKey: ['admin-store-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_reviews')
        .select(`
          *,
          store:stores(id, name, logo_url),
          order:orders(order_number)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch courier reviews
  const { data: courierReviews, isLoading: loadingCourierReviews } = useQuery({
    queryKey: ['admin-courier-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courier_reviews')
        .select(`
          *,
          order:orders(order_number),
          special_order:special_orders(order_number)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch courier profiles for names
  const { data: courierProfiles } = useQuery({
    queryKey: ['courier-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name');
      
      if (error) throw error;
      return data;
    }
  });

  const getCourierName = (courierId: string) => {
    const profile = courierProfiles?.find(p => p.user_id === courierId);
    return profile?.full_name || 'مندوب';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  // Calculate stats
  const storeStats = {
    total: storeReviews?.length || 0,
    avgRating: storeReviews?.length 
      ? (storeReviews.reduce((acc, r) => acc + r.rating, 0) / storeReviews.length).toFixed(1)
      : 0
  };

  const courierStats = {
    total: courierReviews?.length || 0,
    avgRating: courierReviews?.length 
      ? (courierReviews.reduce((acc, r) => acc + r.rating, 0) / courierReviews.length).toFixed(1)
      : 0
  };

  return (
    <AdminLayout title="التقييمات">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">التقييمات</h1>
          <p className="text-muted-foreground">إدارة ومراجعة تقييمات المتاجر والمناديب</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Store className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تقييمات المتاجر</p>
                  <p className="text-2xl font-bold">{storeStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">متوسط تقييم المتاجر</p>
                  <p className="text-2xl font-bold">{storeStats.avgRating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تقييمات المناديب</p>
                  <p className="text-2xl font-bold">{courierStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">متوسط تقييم المناديب</p>
                  <p className="text-2xl font-bold">{courierStats.avgRating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              تقييمات المتاجر
            </TabsTrigger>
            <TabsTrigger value="courier" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              تقييمات المناديب
            </TabsTrigger>
          </TabsList>

          <TabsContent value="store" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>تقييمات المتاجر</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStoreReviews ? (
                  <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
                ) : storeReviews?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">لا توجد تقييمات بعد</p>
                ) : (
                  <div className="space-y-4">
                    {storeReviews?.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {review.store?.logo_url ? (
                              <img 
                                src={review.store.logo_url} 
                                alt={review.store?.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                <Store className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{review.store?.name || 'متجر محذوف'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {renderStars(review.rating)}
                                <span className="text-sm text-muted-foreground">({review.rating}/5)</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(review.created_at), 'dd MMM yyyy', { locale: ar })}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-3 text-sm bg-muted p-3 rounded-lg">{review.comment}</p>
                        )}
                        {review.order?.order_number && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            الطلب: {review.order.order_number}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courier" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>تقييمات المناديب</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCourierReviews ? (
                  <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
                ) : courierReviews?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">لا توجد تقييمات بعد</p>
                ) : (
                  <div className="space-y-4">
                    {courierReviews?.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{getCourierName(review.courier_id)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {renderStars(review.rating)}
                                <span className="text-sm text-muted-foreground">({review.rating}/5)</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(review.created_at), 'dd MMM yyyy', { locale: ar })}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-3 text-sm bg-muted p-3 rounded-lg">{review.comment}</p>
                        )}
                        {(review.order?.order_number || review.special_order?.order_number) && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            الطلب: {review.order?.order_number || review.special_order?.order_number}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default ReviewsPage;
