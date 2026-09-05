"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { StoreProfileCard } from "@/components/settings/StoreProfileCard";
import { CategoryManagerCard } from "@/components/settings/CategoryManagerCard";
import { UnitManagerCard } from "@/components/settings/UnitManagerCard";
import { DataManagementCard } from "@/components/settings/DataManagementCard";
import { useInventory } from "@/context/InventoryContext";

export default function SettingsPage() {
  const {
    products,
    categories,
    settings,
    allUnits,
    setSidebarOpen,
    refreshInventory,
    updateSettings,
    addCategory,
    editCategory,
    removeCategory,
    showToast,
  } = useInventory();

  return (
    <>
      {/* Header */}
      <AppHeader
        title="Store Settings & Personalizations"
        subtitle="Manage store identity, product categories, packaging units, and data backups"
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <main className="p-4 sm:p-8 space-y-6 flex-1 max-w-5xl">
        {/* 1. Store Profile & Personalization */}
        <StoreProfileCard
          settings={settings}
          onSave={(newSettings) => {
            updateSettings(newSettings);
            showToast("Store preferences saved successfully!", "success");
          }}
        />

        {/* 2. Category Management Hub */}
        <CategoryManagerCard
          categories={categories}
          onAddCategory={addCategory}
          onEditCategory={editCategory}
          onRemoveCategory={removeCategory}
          showToast={showToast}
        />

        {/* 3. Unit of Measure Hub */}
        <UnitManagerCard
          settings={settings}
          allUnits={allUnits}
          onUpdateSettings={updateSettings}
          showToast={showToast}
        />

        {/* 4. Data Backup, Export & Purge */}
        <DataManagementCard
          products={products}
          onRefreshInventory={refreshInventory}
          showToast={showToast}
        />
      </main>
    </>
  );
}
