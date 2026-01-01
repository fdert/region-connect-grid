import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "../DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Package, Edit, Trash2, Loader2, Upload, Download, Image, MoreVertical, FileSpreadsheet, ClipboardPaste, Link } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import UrlImportDialog from "@/components/merchant/UrlImportDialog";

interface ProductForm {
  name: string;
  description: string;
  price: number;
  compare_price: number;
  stock: number;
  category_id: string;
  is_active: boolean;
  image_url: string;
}

const MerchantProducts = () => {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isUrlImportDialogOpen, setIsUrlImportDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [importCategoryId, setImportCategoryId] = useState<string>("");
  const [removeWatermarks, setRemoveWatermarks] = useState(false);
  const [processingWatermarks, setProcessingWatermarks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: 0,
    compare_price: 0,
    stock: 0,
    category_id: "",
    is_active: true,
    image_url: "",
  });
  const queryClient = useQueryClient();

  // Get current user's store
  const { data: store } = useQuery({
    queryKey: ["merchant-store"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Get products for the store
  const { data: products, isLoading } = useQuery({
    queryKey: ["merchant-products", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name_ar)")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Get categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
  });

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${store?.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  // Create/Update product
  const saveMutation = useMutation({
    mutationFn: async (data: ProductForm & { id?: string }) => {
      let imageUrl = data.image_url;

      // Upload new image if selected
      if (imageFile) {
        setIsUploading(true);
        try {
          imageUrl = await uploadImage(imageFile);
        } finally {
          setIsUploading(false);
        }
      }

      if (data.id) {
        const { error } = await supabase
          .from("products")
          .update({
            name: data.name,
            description: data.description,
            price: data.price,
            compare_price: data.compare_price || null,
            stock: data.stock,
            category_id: data.category_id || null,
            is_active: data.is_active,
            images: imageUrl ? [imageUrl] : [],
          })
          .eq("id", data.id);
        
        if (error) throw error;
      } else {
        if (!store?.id) throw new Error("No store found");
        
        const { error } = await supabase
          .from("products")
          .insert({
            store_id: store.id,
            name: data.name,
            description: data.description,
            price: data.price,
            compare_price: data.compare_price || null,
            stock: data.stock,
            category_id: data.category_id || null,
            is_active: data.is_active,
            images: imageUrl ? [imageUrl] : [],
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-products"] });
      toast.success(editingProduct ? "تم تحديث المنتج" : "تم إضافة المنتج");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حفظ المنتج");
    },
  });

  // Delete product
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-products"] });
      toast.success("تم حذف المنتج");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حذف المنتج");
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-products"] });
      toast.success("تم تحديث حالة المنتج");
    },
  });

  // Import products mutation
  const importMutation = useMutation({
    mutationFn: async ({ productsData, categoryId, shouldRemoveWatermarks }: { productsData: any[]; categoryId?: string; shouldRemoveWatermarks?: boolean }) => {
      if (!store?.id) throw new Error("No store found");

      // Process watermarks if enabled
      let processedProducts = productsData;
      if (shouldRemoveWatermarks) {
        setProcessingWatermarks(true);
        try {
          processedProducts = await Promise.all(
            productsData.map(async (product) => {
              if (product.image_url) {
                try {
                  const { data, error } = await supabase.functions.invoke("remove-watermark", {
                    body: { imageUrl: product.image_url },
                  });
                  if (!error && data?.cleanedImageUrl) {
                    return { ...product, image_url: data.cleanedImageUrl };
                  }
                } catch (e) {
                  console.error("Watermark removal failed for:", product.name, e);
                }
              }
              return product;
            })
          );
        } finally {
          setProcessingWatermarks(false);
        }
      }

      for (const product of processedProducts) {
        // Check if product exists by name
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("store_id", store.id)
          .eq("name", product.name)
          .maybeSingle();

        if (existing) {
          // Update existing product
          await supabase
            .from("products")
            .update({
              description: product.description || null,
              price: product.price || 0,
              compare_price: product.compare_price || null,
              stock: product.stock || 0,
              is_active: product.is_active !== false,
              images: product.image_url ? [product.image_url] : undefined,
              category_id: categoryId || null,
            })
            .eq("id", existing.id);
        } else {
          // Insert new product
          await supabase
            .from("products")
            .insert({
              store_id: store.id,
              name: product.name,
              description: product.description || null,
              price: product.price || 0,
              compare_price: product.compare_price || null,
              stock: product.stock || 0,
              is_active: product.is_active !== false,
              images: product.image_url ? [product.image_url] : [],
              category_id: categoryId || null,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-products"] });
      toast.success("تم استيراد المنتجات بنجاح");
      setIsImportDialogOpen(false);
      setPasteData("");
      setImportCategoryId("");
      setRemoveWatermarks(false);
    },
    onError: (error: any) => {
      console.error("Import error:", error);
      toast.error("حدث خطأ أثناء استيراد المنتجات");
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      const images = product.images as string[] || [];
      setForm({
        name: product.name,
        description: product.description || "",
        price: product.price,
        compare_price: product.compare_price || 0,
        stock: product.stock || 0,
        category_id: product.category_id || "",
        is_active: product.is_active,
        image_url: images[0] || "",
      });
      setImagePreview(images[0] || "");
    } else {
      setEditingProduct(null);
      setForm({
        name: "",
        description: "",
        price: 0,
        compare_price: 0,
        stock: 0,
        category_id: "",
        is_active: true,
        image_url: "",
      });
      setImagePreview("");
    }
    setImageFile(null);
    setImageInputMode("upload");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview("");
  };

  const handleSubmit = () => {
    if (!form.name || form.price <= 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    saveMutation.mutate({ ...form, id: editingProduct?.id });
  };

  // Export products to Excel
  const handleExport = () => {
    if (!products || products.length === 0) {
      toast.error("لا توجد منتجات للتصدير");
      return;
    }

    const exportData = products.map(p => {
      const images = p.images as string[] || [];
      return {
        "اسم المنتج": p.name,
        "الوصف": p.description || "",
        "السعر": p.price,
        "السعر قبل الخصم": p.compare_price || "",
        "المخزون": p.stock || 0,
        "نشط": p.is_active ? "نعم" : "لا",
        "رابط الصورة": images[0] || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
    XLSX.writeFile(wb, `منتجات_${store?.name || "المتجر"}.xlsx`);
    toast.success("تم تصدير المنتجات بنجاح");
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "اسم المنتج": "منتج تجريبي",
        "الوصف": "وصف المنتج",
        "السعر": 100,
        "السعر قبل الخصم": 150,
        "المخزون": 50,
        "نشط": "نعم",
        "رابط الصورة": "https://example.com/image.jpg",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
    XLSX.writeFile(wb, "قالب_المنتجات.xlsx");
  };

  // Handle Excel file import
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const productsData = jsonData.map((row: any) => ({
          name: row["اسم المنتج"] || row["name"] || "",
          description: row["الوصف"] || row["description"] || "",
          price: parseFloat(row["السعر"] || row["price"]) || 0,
          compare_price: parseFloat(row["السعر قبل الخصم"] || row["compare_price"]) || null,
          stock: parseInt(row["المخزون"] || row["stock"]) || 0,
          is_active: (row["نشط"] || row["is_active"]) === "نعم" || row["is_active"] === true,
          image_url: row["رابط الصورة"] || row["image_url"] || "",
        })).filter(p => p.name);

        if (productsData.length === 0) {
          toast.error("لم يتم العثور على منتجات صالحة في الملف");
          return;
        }

        importMutation.mutate({ productsData, categoryId: importCategoryId || undefined, shouldRemoveWatermarks: removeWatermarks });
      } catch (error) {
        console.error("Excel parse error:", error);
        toast.error("حدث خطأ أثناء قراءة الملف");
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (excelInputRef.current) {
      excelInputRef.current.value = "";
    }
  };

  // Handle paste import
  const handlePasteImport = () => {
    if (!pasteData.trim()) {
      toast.error("يرجى لصق البيانات أولاً");
      return;
    }

    try {
      const lines = pasteData.trim().split("\n");
      const headers = lines[0].split("\t");
      
      const productsData = lines.slice(1).map(line => {
        const values = line.split("\t");
        const product: any = {};
        
        headers.forEach((header, index) => {
          const h = header.trim();
          const v = values[index]?.trim() || "";
          
          if (h === "اسم المنتج" || h === "name") product.name = v;
          else if (h === "الوصف" || h === "description") product.description = v;
          else if (h === "السعر" || h === "price") product.price = parseFloat(v) || 0;
          else if (h === "السعر قبل الخصم" || h === "compare_price") product.compare_price = parseFloat(v) || null;
          else if (h === "المخزون" || h === "stock") product.stock = parseInt(v) || 0;
          else if (h === "نشط" || h === "is_active") product.is_active = v === "نعم" || v === "true";
          else if (h === "رابط الصورة" || h === "image_url") product.image_url = v;
        });
        
        return product;
      }).filter(p => p.name);

      if (productsData.length === 0) {
        toast.error("لم يتم العثور على منتجات صالحة");
        return;
      }

      importMutation.mutate({ productsData, categoryId: importCategoryId || undefined, shouldRemoveWatermarks: removeWatermarks });
    } catch (error) {
      console.error("Paste parse error:", error);
      toast.error("حدث خطأ أثناء معالجة البيانات");
    }
  };

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = {
    total: products?.length || 0,
    active: products?.filter(p => p.is_active).length || 0,
    outOfStock: products?.filter(p => (p.stock || 0) === 0).length || 0,
  };

  return (
    <DashboardLayout role="merchant">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
            <p className="text-muted-foreground">إضافة وتعديل منتجات متجرك</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreVertical className="w-4 h-4" />
                  المزيد
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsUrlImportDialogOpen(true)}>
                  <Link className="w-4 h-4 ml-2" />
                  استيراد من رابط ويب
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="w-4 h-4 ml-2" />
                  استيراد من ملف Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 ml-2" />
                  تصدير المنتجات
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="w-4 h-4 ml-2" />
                  تحميل القالب
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة منتج
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">منتجات نشطة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.outOfStock}</p>
                <p className="text-sm text-muted-foreground">نفذت الكمية</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن منتج..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>المنتجات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد منتجات
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">القسم</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">المخزون</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const images = product.images as string[] || [];
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {images[0] ? (
                                <img 
                                  src={images[0]} 
                                  alt={product.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {product.description || "-"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{(product.categories as any)?.name_ar || "-"}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{product.price} ر.س</span>
                              {product.compare_price && product.compare_price > product.price && (
                                <span className="text-sm text-muted-foreground line-through mr-2">
                                  {product.compare_price} ر.س
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                              {product.stock || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={product.is_active}
                              onCheckedChange={(checked) =>
                                toggleActiveMutation.mutate({ id: product.id, is_active: checked })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
                                    deleteMutation.mutate(product.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Image Upload/URL */}
              <div>
                <Label>صورة المنتج</Label>
                <div className="flex gap-2 mt-2 mb-3">
                  <Button
                    type="button"
                    variant={imageInputMode === "upload" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImageInputMode("upload")}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 ml-1" />
                    رفع صورة
                  </Button>
                  <Button
                    type="button"
                    variant={imageInputMode === "url" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImageInputMode("url")}
                    className="flex-1"
                  >
                    <Image className="w-4 h-4 ml-1" />
                    رابط صورة
                  </Button>
                </div>

                {imageInputMode === "upload" ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {imagePreview && !form.image_url.startsWith("http") ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-2 left-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Image className="w-4 h-4 ml-1" />
                          تغيير
                        </Button>
                      </div>
                    ) : imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-2 left-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Image className="w-4 h-4 ml-1" />
                          تغيير
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <Image className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">اضغط لرفع صورة</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={form.image_url}
                      onChange={(e) => {
                        setForm({ ...form, image_url: e.target.value });
                        setImagePreview(e.target.value);
                        setImageFile(null);
                      }}
                      placeholder="https://example.com/image.jpg"
                      dir="ltr"
                    />
                    {form.image_url && (
                      <img 
                        src={form.image_url} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>اسم المنتج *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="أدخل اسم المنتج"
                />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف المنتج"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>السعر الحالي (سعر البيع) *</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">السعر الذي سيدفعه العميل</p>
                </div>
                <div>
                  <Label>السعر الأصلي (قبل الخصم)</Label>
                  <Input
                    type="number"
                    value={form.compare_price}
                    onChange={(e) => setForm({ ...form, compare_price: Number(e.target.value) })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">اتركه فارغاً أو اجعله أكبر من السعر الحالي لعرض الخصم</p>
                </div>
              </div>
              
              {/* Discount Preview */}
              {form.compare_price > 0 && form.price > 0 && form.compare_price > form.price && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-lg font-bold">
                      خصم {Math.round((1 - form.price / form.compare_price) * 100)}%
                    </span>
                    <span className="text-sm">
                      (وفر {(form.compare_price - form.price).toFixed(2)} ر.س)
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">سيظهر هذا المنتج في قسم العروض الخاصة</p>
                </div>
              )}
              
              {form.compare_price > 0 && form.price > 0 && form.compare_price <= form.price && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">
                    ⚠️ السعر الأصلي يجب أن يكون أكبر من السعر الحالي لعرض الخصم
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>المخزون</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>القسم</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(value) => setForm({ ...form, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name_ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label>منتج نشط</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>إلغاء</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending || isUploading}>
                {(saveMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                {editingProduct ? "حفظ التغييرات" : "إضافة المنتج"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) {
            setImportCategoryId("");
            setPasteData("");
            setRemoveWatermarks(false);
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>استيراد المنتجات</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Category Selection */}
              <div>
                <Label className="mb-2 block">تصنيف المنتجات المستوردة</Label>
                <Select
                  value={importCategoryId}
                  onValueChange={setImportCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف للمنتجات" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">سيتم تطبيق هذا التصنيف على جميع المنتجات المستوردة</p>
              </div>

              {/* Watermark Removal Option */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">إزالة العلامات المائية</Label>
                  <p className="text-xs text-muted-foreground">إزالة الشعارات والعلامات من صور المنتجات بالذكاء الاصطناعي</p>
                </div>
                <Switch
                  checked={removeWatermarks}
                  onCheckedChange={setRemoveWatermarks}
                  disabled={importMutation.isPending || processingWatermarks}
                />
              </div>


              {/* Import Mode Tabs */}
              <div className="flex gap-2">
                <Button
                  variant={importMode === "file" ? "default" : "outline"}
                  onClick={() => setImportMode("file")}
                  className="flex-1 gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  ملف Excel
                </Button>
                <Button
                  variant={importMode === "paste" ? "default" : "outline"}
                  onClick={() => setImportMode("paste")}
                  className="flex-1 gap-2"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  نسخ ولصق
                </Button>
              </div>

              {importMode === "file" ? (
                <div>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                  <div
                    onClick={() => excelInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium mb-1">اضغط لاختيار ملف Excel</p>
                    <p className="text-sm text-muted-foreground">
                      يدعم ملفات .xlsx و .xls و .csv
                    </p>
                  </div>
                  <Button
                    variant="link"
                    onClick={handleDownloadTemplate}
                    className="mt-2 text-sm"
                  >
                    <Download className="w-4 h-4 ml-1" />
                    تحميل قالب Excel
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    انسخ البيانات من Excel والصقها هنا (مع العناوين)
                  </p>
                  <Textarea
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                    placeholder="اسم المنتج&#9;الوصف&#9;السعر&#9;المخزون&#10;منتج 1&#9;وصف المنتج&#9;100&#9;50"
                    rows={8}
                    dir="ltr"
                  />
                  <Button
                    onClick={handlePasteImport}
                    disabled={importMutation.isPending || processingWatermarks || !pasteData.trim()}
                    className="w-full mt-4"
                  >
                    {(importMutation.isPending || processingWatermarks) && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    {processingWatermarks ? "جارِ إزالة العلامات المائية..." : "استيراد المنتجات"}
                  </Button>
                </div>
              )}

              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">ملاحظة:</p>
                <p className="text-muted-foreground">
                  إذا كان المنتج موجوداً بنفس الاسم، سيتم تحديثه بدلاً من إنشاء منتج جديد.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* URL Import Dialog */}
        {store && (
          <UrlImportDialog
            isOpen={isUrlImportDialogOpen}
            onClose={() => setIsUrlImportDialogOpen(false)}
            storeId={store.id}
            categories={categories || []}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default MerchantProducts;
