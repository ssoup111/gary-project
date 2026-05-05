"use client";

import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  color?: string;
};

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("gary_cart");

    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Could not load cart:", error);
        setCartItems([]);
      }
    }
  }, []);

  function saveCart(updatedCart: CartItem[]) {
    setCartItems(updatedCart);
    localStorage.setItem("gary_cart", JSON.stringify(updatedCart));
  }

  function increaseQuantity(id: string) {
    const updatedCart = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );

    saveCart(updatedCart);
  }

  function decreaseQuantity(id: string) {
    const updatedCart = cartItems
      .map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      )
      .filter((item) => item.quantity > 0);

    saveCart(updatedCart);
  }

  function removeItem(id: string) {
    const updatedCart = cartItems.filter((item) => item.id !== id);
    saveCart(updatedCart);
  }

  function clearCart() {
    saveCart([]);
  }

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "60px auto",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Your Cart</h1>
      <p>Review the items you selected for Gary&apos;s Picture Project.</p>

      {cartItems.length === 0 ? (
        <div
          style={{
            marginTop: "30px",
            padding: "30px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            background: "#fafafa",
          }}
        >
          <h2>Your cart is empty.</h2>
          <p>When products or photo services are added, they will show here.</p>

          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: "15px",
              padding: "12px 18px",
              background: "black",
              color: "white",
              textDecoration: "none",
              borderRadius: "8px",
            }}
          >
            Return Home
          </a>
        </div>
      ) : (
        <>
          <div style={{ marginTop: "30px" }}>
            {cartItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr auto",
                  gap: "20px",
                  alignItems: "center",
                  padding: "20px",
                  marginBottom: "15px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  background: "white",
                }}
              >
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    background: "#eee",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                </div>

                <div>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: "20px" }}>
                    {item.name}
                  </h2>

                  {item.size && <p style={{ margin: "4px 0" }}>Size: {item.size}</p>}
                  {item.color && (
                    <p style={{ margin: "4px 0" }}>Color: {item.color}</p>
                  )}

                  <p style={{ margin: "8px 0", fontWeight: "bold" }}>
                    ${item.price.toFixed(2)}
                  </p>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.id)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                      }}
                    >
                      -
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.id)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        marginLeft: "10px",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div style={{ fontWeight: "bold" }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "30px",
              padding: "25px",
              border: "1px solid #ddd",
              borderRadius: "12px",
              background: "#fafafa",
              textAlign: "right",
            }}
          >
            <h2>Subtotal: ${subtotal.toFixed(2)}</h2>

            <p style={{ color: "#666" }}>
              Checkout will be connected later.
            </p>

            <button
              type="button"
              onClick={clearCart}
              style={{
                padding: "12px 18px",
                marginRight: "10px",
                cursor: "pointer",
                borderRadius: "8px",
                border: "1px solid #999",
                background: "white",
              }}
            >
              Clear Cart
            </button>

            <button
              type="button"
              onClick={() => alert("Checkout will be added later.")}
              style={{
                padding: "12px 18px",
                cursor: "pointer",
                borderRadius: "8px",
                border: "none",
                background: "black",
                color: "white",
              }}
            >
              Checkout
            </button>
          </div>
        </>
      )}
    </main>
  );
}