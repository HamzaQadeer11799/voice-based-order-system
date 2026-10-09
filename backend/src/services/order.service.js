import menu from "../data/menu.js";

export const processOrder = async (orderData) => {
  const { items } = orderData;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }

  const processedItems = items.map((orderItem) => {
    const { product, quantity } = orderItem;

    if (!product) {
      throw new Error("Product is required.");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(
        `Quantity for "${product}" must be a positive integer.`
      );
    }

    const menuItem = menu.find(
      (item) => item.name.toLowerCase() === product.trim().toLowerCase()
    );

    if (!menuItem) {
      throw new Error(`Product "${product}" is not available.`);
    }

    const totalPrice = menuItem.price * quantity;

    return {
      productId: menuItem.id,
      name: menuItem.name,
      quantity,
      unitPrice: menuItem.price,
      totalPrice,
    };
  });

  const totalAmount = processedItems.reduce(
    (total, item) => total + item.totalPrice,
    0
  );

  return {
    items: processedItems,
    totalAmount,
  };
};