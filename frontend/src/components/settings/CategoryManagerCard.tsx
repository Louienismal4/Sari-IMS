"use client";

import { useState, useId } from "react";
import { Layers, Plus, Edit3, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { Category } from "@/types/inventory";

interface CategoryManagerCardProps {
  categories: Category[];
  onAddCategory: (name: string) => Promise<Category>;
  onEditCategory: (id: number, name: string) => Promise<Category>;
  onRemoveCategory: (id: number) => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function CategoryManagerCard({
  categories,
  onAddCategory,
  onEditCategory,
  onRemoveCategory,
  showToast,
}: CategoryManagerCardProps) {
  const [newCatName, setNewCatName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Edit State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Delete State
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const addCatInputId = useId();
  const editCatInputId = useId();

  // Handle Add Category
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsAdding(true);
    setError(null);
    try {
      const created = await onAddCategory(newCatName.trim());
      setNewCatName("");
      showToast(`Category "${created.name}" created!`, "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add category";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsAdding(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setError(null);
  };

  // Handle Update Category
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    setIsEditing(true);
    setError(null);
    try {
      await onEditCategory(editingCategory.id, editName.trim());
      showToast(`Updated category to "${editName.trim()}"`, "success");
      setEditingCategory(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update category";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle Confirm Delete Category
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      await onRemoveCategory(categoryToDelete.id);
      showToast(`Deleted category "${categoryToDelete.name}"`, "info");
      setCategoryToDelete(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      showToast(message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="shadow-2xs border-zinc-200">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900">
                  Product Categories ({categories.length})
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Add, rename, or organize catalog departments and item groupings
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Inline Add Category Form */}
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id={addCatInputId}
                type="text"
                placeholder="New category name (e.g. Frozen Foods, Condiments)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="text-xs"
                disabled={isAdding}
              />
            </div>
            <Button
              type="submit"
              disabled={isAdding || !newCatName.trim()}
              size="sm"
              className="gap-1 text-xs shrink-0 min-h-[36px]"
            >
              {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>+ Add Category</span>
            </Button>
          </form>

          {/* Categories Grid / Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {categories.map((cat) => {
              const count = cat.products_count ?? 0;
              return (
                <div
                  key={cat.id}
                  className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2 hover:border-zinc-300 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 truncate">
                      {cat.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-white shrink-0">
                      {count} SKUs
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(cat)}
                      className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
                      title="Edit Category Name"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCategoryToDelete(cat)}
                      className="h-7 w-7 text-zinc-400 hover:text-rose-600"
                      title="Delete Category"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category Name</DialogTitle>
            <DialogDescription className="text-xs">
              Update the category name across all assigned store products.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label htmlFor={editCatInputId} className="text-xs font-semibold text-zinc-700">
                Category Name *
              </label>
              <Input
                id={editCatInputId}
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingCategory(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isEditing || !editName.trim()}
                className="text-xs"
              >
                {isEditing ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        itemName={categoryToDelete?.name}
        confirmText="Delete Category"
        description={
          categoryToDelete?.products_count && categoryToDelete.products_count > 0
            ? `Category "${categoryToDelete.name}" has ${categoryToDelete.products_count} registered products. Deleting it will keep the items in your inventory and move them to "Uncategorized".`
            : undefined
        }
        loading={isDeleting}
      />
    </>
  );
}
