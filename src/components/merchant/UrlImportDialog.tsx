import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Link, Search, Package, CheckCircle } from "lucide-react";

interface Category {
  id: string;
  name: string;
  name_ar: string;
}

interface ScrapedProduct {
  name: string;
  description: string;
  price: number;
  compare_price: number | null;
  image_url: string;
  stock: number;
  category_id: string | null;
  selected?: boolean;
}

interface UrlImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  categories: Category[];
}

const UrlImportDialog = ({
  isOpen,
  onClose,
  storeId,
  categories,
}: UrlImportDialogProps) => {
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [scrapeAllPages, setScrapeAllPages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");
  const queryClient = useQueryClient();

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error("يرجى إدخال رابط الموقع");
      return;
    }

    setIsLoading(true);
    try {
      const effectiveCategoryId = categoryId === "none" ? null : categoryId || null;
      const { data, error } = await supabase.functions.invoke("scrape-products", {
        body: { url, categoryId: effectiveCategoryId, scrapeAllPages },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "فشل في جلب المنتجات");
      }

      if (data.products.length === 0) {
        toast.error("لم يتم العثور على منتجات في هذا الرابط");
        return;
      }

      setScrapedProducts(
        data.products.map((p: ScrapedProduct) => ({ ...p, selected: true }))
      );
      setStep("preview");
      toast.success(`تم العثور على ${data.products.length} منتج`);
    } catch (error: any) {
      console.error("Scrape error:", error);
      toast.error(error.message || "حدث خطأ أثناء جلب المنتجات");
    } finally {
      setIsLoading(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (products: ScrapedProduct[]) => {
      const selectedProducts = products.filter((p) => p.selected);
      
      for (const product of selectedProducts) {
        // Check if product exists
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("store_id", storeId)
          .eq("name", product.name)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("products")
            .update({
              description: product.description || null,
              price: product.price || 0,
              compare_price: product.compare_price || null,
              stock: product.stock || 100,
              category_id: product.category_id || null,
              images: product.image_url ? [product.image_url] : undefined,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("products").insert({
            store_id: storeId,
            name: product.name,
            description: product.description || null,
            price: product.price || 0,
            compare_price: product.compare_price || null,
            stock: product.stock || 100,
            category_id: product.category_id || null,
            images: product.image_url ? [product.image_url] : [],
            is_active: true,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-products"] });
      toast.success("تم استيراد المنتجات بنجاح");
      handleClose();
    },
    onError: (error: any) => {
      console.error("Import error:", error);
      toast.error("حدث خطأ أثناء استيراد المنتجات");
    },
  });

  const handleClose = () => {
    setUrl("");
    setCategoryId("none");
    setScrapeAllPages(false);
    setScrapedProducts([]);
    setStep("input");
    onClose();
  };

  const toggleProduct = (index: number) => {
    setScrapedProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const toggleAll = () => {
    const allSelected = scrapedProducts.every((p) => p.selected);
    setScrapedProducts((prev) =>
      prev.map((p) => ({ ...p, selected: !allSelected }))
    );
  };

  const selectedCount = scrapedProducts.filter((p) => p.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            استيراد المنتجات من رابط ويب
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "أدخل رابط الموقع لجلب المنتجات تلقائياً"
              : `تم العثور على ${scrapedProducts.length} منتج. اختر المنتجات التي تريد استيرادها.`}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>رابط الموقع *</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/products"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                أدخل رابط صفحة المنتجات أو المتجر الذي تريد جلب المنتجات منه
              </p>
            </div>

            <div className="space-y-2">
              <Label>تصنيف المنتجات (اختياري)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون تصنيف</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="scrape-all-pages" className="text-sm font-medium">جلب من صفحات متعددة</Label>
                <p className="text-xs text-muted-foreground">
                  تفعيل هذا الخيار سيجلب المنتجات من جميع صفحات التصنيف (أبطأ)
                </p>
              </div>
              <Switch
                id="scrape-all-pages"
                checked={scrapeAllPages}
                onCheckedChange={setScrapeAllPages}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                إلغاء
              </Button>
              <Button onClick={handleScrape} disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الجلب...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    جلب المنتجات
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={scrapedProducts.every((p) => p.selected)}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm">تحديد الكل</span>
              </div>
              <Badge variant="secondary">
                {selectedCount} من {scrapedProducts.length} محدد
              </Badge>
            </div>

            <div className="rounded-lg border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-16">الصورة</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead className="text-left">السعر</TableHead>
                    <TableHead className="text-left">المخزون</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scrapedProducts.map((product, index) => (
                    <TableRow key={index} className={!product.selected ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={product.selected}
                          onCheckedChange={() => toggleProduct(index)}
                        />
                      </TableCell>
                      <TableCell>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{product.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{product.price} ر.س</p>
                          {product.compare_price && (
                            <p className="text-xs text-muted-foreground line-through">
                              {product.compare_price} ر.س
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("input")}>
                رجوع
              </Button>
              <Button
                onClick={() => importMutation.mutate(scrapedProducts)}
                disabled={importMutation.isPending || selectedCount === 0}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الاستيراد...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    استيراد {selectedCount} منتج
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UrlImportDialog;
