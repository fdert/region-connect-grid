import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

const PrivacyPolicy = () => {
  const { data: page, isLoading } = useQuery({
    queryKey: ["static-page", "privacy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .eq("page_key", "privacy")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative py-16 gradient-hero text-primary-foreground overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {isLoading ? <Skeleton className="h-10 w-48 mx-auto" /> : page?.title_ar || "سياسة الخصوصية"}
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-card rounded-2xl p-8 border shadow-sm">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <div 
                className="prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: page?.content_ar || "" }}
              />
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default PrivacyPolicy;
