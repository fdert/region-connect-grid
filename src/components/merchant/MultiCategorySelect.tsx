import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  name_ar: string;
}

interface MultiCategorySelectProps {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MultiCategorySelect = ({
  categories,
  selectedIds,
  onChange,
  placeholder = "اختر التصنيفات",
  disabled = false,
}: MultiCategorySelectProps) => {
  const [open, setOpen] = useState(false);

  const handleToggle = (categoryId: string) => {
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedIds, categoryId]);
    }
  };

  const handleRemove = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((id) => id !== categoryId));
  };

  const selectedCategories = categories.filter((c) => selectedIds.includes(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-auto min-h-10",
            selectedIds.length === 0 && "text-muted-foreground"
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 text-right">
            {selectedCategories.length > 0 ? (
              selectedCategories.map((category) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  className="gap-1"
                >
                  {category.name_ar}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleRemove(category.id, e)}
                  />
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا توجد تصنيفات متاحة
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                onClick={() => handleToggle(category.id)}
              >
                <Checkbox
                  id={category.id}
                  checked={selectedIds.includes(category.id)}
                  onCheckedChange={() => handleToggle(category.id)}
                />
                <Label
                  htmlFor={category.id}
                  className="flex-1 cursor-pointer text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {category.name_ar}
                  </div>
                </Label>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MultiCategorySelect;
