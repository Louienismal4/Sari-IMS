"use client";

import { useState, useCallback, useMemo } from "react";
import { Product, CartItem } from "@/types/inventory";

interface UsePosCartOptions {
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function usePosCart(options?: UsePosCartOptions) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Add product to cart or bump quantity
  const addToCart = useCallback(
    (product: Product, quantityToAdd = 1) => {
      if (product.stock_quantity <= 0) {
        options?.showToast?.(`"${product.name}" is out of stock!`, "warning");
        return false;
      }

      setCartItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.id === product.id);
        const unitPrice = parseFloat(product.selling_price) || 0;

        if (existingIndex > -1) {
          const currentItem = prev[existingIndex];
          const updatedQty = currentItem.quantity + quantityToAdd;

          if (updatedQty > product.stock_quantity) {
            options?.showToast?.(
              `Cannot add more than ${product.stock_quantity} ${product.unit} of "${product.name}".`,
              "warning"
            );
            return prev;
          }

          const updated = [...prev];
          updated[existingIndex] = {
            ...currentItem,
            quantity: updatedQty,
            subtotal: unitPrice * updatedQty,
          };
          return updated;
        }

        if (quantityToAdd > product.stock_quantity) {
          options?.showToast?.(
            `Only ${product.stock_quantity} available for "${product.name}".`,
            "warning"
          );
          return prev;
        }

        return [
          ...prev,
          {
            product,
            quantity: quantityToAdd,
            unit_price: unitPrice,
            subtotal: unitPrice * quantityToAdd,
          },
        ];
      });

      return true;
    },
    [options]
  );

  // Update specific item quantity
  const updateQuantity = useCallback(
    (productId: number, newQuantity: number) => {
      if (newQuantity <= 0) {
        setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
        return;
      }

      setCartItems((prev) =>
        prev.map((item) => {
          if (item.product.id === productId) {
            const max = item.product.stock_quantity;
            if (newQuantity > max) {
              options?.showToast?.(
                `Only ${max} available for "${item.product.name}".`,
                "warning"
              );
              return item;
            }
            return {
              ...item,
              quantity: newQuantity,
              subtotal: item.unit_price * newQuantity,
            };
          }
          return item;
        })
      );
    },
    [options]
  );

  // Remove single item from cart
  const removeFromCart = useCallback((productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  // Clear all items in cart
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Computed metrics
  const totalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    [cartItems]
  );

  const totalItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  return {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    totalItemCount,
  };
}
