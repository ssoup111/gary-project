"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type CartImage = {
  id: string;
  image_url: string | null;
  prompt: string;
  category_slug: string | null;
};

export type CartPlan = {
  id: string;
  slug: string;
  name: string;
  plan_type: string;
  image_count: number;
  price_cents: number;
  duration_days: number | null;
};

export type CartItem = {
  /** Stable identity. Same photo -> same key, so a photo can never be
   *  added twice. Same plan with the same categories -> same key too. */
  key: string;
  item_type: "image" | "plan";
  image: CartImage | null;
  plan: CartPlan | null;
  category_slugs: string[];
  price_cents: number;
};

/** Shape of a cart_items row with its image/plan joined in. */
type ServerCartRow = {
  item_type: "image" | "plan";
  category_slugs: string[] | null;
  price_cents: number;
  generated_images: CartImage | CartImage[] | null;
  product_plans: CartPlan | CartPlan[] | null;
};

const LS_KEY = "fbb_cart_v1";

/* ------------------------------------------------------------------ *
 * Key helpers
 * ------------------------------------------------------------------ */

export function imageKey(imageId: string) {
  return `image:${imageId}`;
}

export function planKey(planId: string, categorySlugs: string[]) {
  return `plan:${planId}:${[...categorySlugs].sort().join(",")}`;
}

/* ------------------------------------------------------------------ *
 * localStorage
 * ------------------------------------------------------------------ */

function readLocal(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    /* private mode / quota - the cart still works for this page view */
  }
}

/* ------------------------------------------------------------------ *
 * Merge
 * ------------------------------------------------------------------ */

function mergeByKey(a: CartItem[], b: CartItem[]): CartItem[] {
  const seen = new Map<string, CartItem>();
  for (const item of [...a, ...b]) {
    if (!seen.has(item.key)) seen.set(item.key, item);
  }
  return [...seen.values()];
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

type CartContextValue = {
  items: CartItem[];
  count: number;
  totalCents: number;
  ready: boolean;
  hasImage: (imageId: string) => boolean;
  hasPlan: (planId: string, categorySlugs: string[]) => boolean;
  addImage: (image: CartImage, priceCents: number) => void;
  addPlan: (plan: CartPlan, categorySlugs: string[]) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const cartIdRef = useRef<string | null>(null);

  /* ---- hydrate from localStorage immediately ----
   * This has to happen in an effect rather than in a useState initializer:
   * localStorage does not exist during the server render, so reading it any
   * earlier would make the server and client markup disagree. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readLocal());
    setReady(true);
  }, []);

  /* ---- keep localStorage in step ---- */
  useEffect(() => {
    if (ready) writeLocal(items);
  }, [items, ready]);

  /* ---- follow auth ---- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ---- server cart: load, merge, push back ---- */
  const pushToServer = useCallback(
    async (next: CartItem[]) => {
      const cartId = cartIdRef.current;
      if (!cartId) return;
      await supabase.from("cart_items").delete().eq("cart_id", cartId);
      if (next.length === 0) return;
      await supabase.from("cart_items").insert(
        next.map((item) => ({
          cart_id: cartId,
          item_type: item.item_type,
          generated_image_id: item.item_type === "image" ? item.image?.id ?? null : null,
          plan_id: item.item_type === "plan" ? item.plan?.id ?? null : null,
          category_slugs: item.category_slugs,
          price_cents: item.price_cents,
        }))
      );
    },
    []
  );

  useEffect(() => {
    if (!ready) return;

    // Signed out: the browser cart is the whole story.
    if (!userId) {
      cartIdRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      // Find or create this customer's active cart.
      const { data: existing } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      let cartId = existing?.id ?? null;
      if (!cartId) {
        const { data: created } = await supabase
          .from("carts")
          .insert({ user_id: userId, status: "active" })
          .select("id")
          .single();
        cartId = created?.id ?? null;
      }
      if (!cartId || cancelled) return;
      cartIdRef.current = cartId;

      // Pull what the account already had.
      const { data: rows } = await supabase
        .from("cart_items")
        .select(
          "item_type, category_slugs, price_cents, " +
            "generated_images ( id, image_url, prompt, category_slug ), " +
            "product_plans ( id, slug, name, plan_type, image_count, price_cents, duration_days )"
        )
        .eq("cart_id", cartId);

      const serverRows = (rows || []) as unknown as ServerCartRow[];
      const serverItems: CartItem[] = serverRows.flatMap((row): CartItem[] => {
        const slugs: string[] = row.category_slugs || [];
        if (row.item_type === "image") {
          const img = Array.isArray(row.generated_images)
            ? row.generated_images[0]
            : row.generated_images;
          if (!img) return [];
          return [
            {
              key: imageKey(img.id),
              item_type: "image" as const,
              image: img,
              plan: null,
              category_slugs: slugs,
              price_cents: row.price_cents,
            },
          ];
        }
        const plan = Array.isArray(row.product_plans)
          ? row.product_plans[0]
          : row.product_plans;
        if (!plan) return [];
        return [
          {
            key: planKey(plan.id, slugs),
            item_type: "plan" as const,
            image: null,
            plan,
            category_slugs: slugs,
            price_cents: row.price_cents,
          },
        ];
      });

      if (cancelled) return;

      // Merge whatever they built as a guest into the account cart.
      setItems((local) => {
        const merged = mergeByKey(local, serverItems);
        void pushToServer(merged);
        return merged;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, ready, pushToServer]);

  /* ---- mutations ---- */

  const commit = useCallback(
    (next: CartItem[]) => {
      setItems(next);
      void pushToServer(next);
    },
    [pushToServer]
  );

  const addImage = useCallback(
    (image: CartImage, priceCents: number) => {
      setItems((prev) => {
        const key = imageKey(image.id);
        if (prev.some((i) => i.key === key)) return prev; // already in the cart
        const next = [
          ...prev,
          {
            key,
            item_type: "image" as const,
            image,
            plan: null,
            category_slugs: [],
            price_cents: priceCents,
          },
        ];
        void pushToServer(next);
        return next;
      });
    },
    [pushToServer]
  );

  const addPlan = useCallback(
    (plan: CartPlan, categorySlugs: string[]) => {
      setItems((prev) => {
        const key = planKey(plan.id, categorySlugs);
        if (prev.some((i) => i.key === key)) return prev;
        const next = [
          ...prev,
          {
            key,
            item_type: "plan" as const,
            image: null,
            plan,
            category_slugs: [...categorySlugs].sort(),
            price_cents: plan.price_cents,
          },
        ];
        void pushToServer(next);
        return next;
      });
    },
    [pushToServer]
  );

  const removeItem = useCallback(
    (key: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.key !== key);
        void pushToServer(next);
        return next;
      });
    },
    [pushToServer]
  );

  const clear = useCallback(() => commit([]), [commit]);

  const hasImage = useCallback(
    (imageId: string) => items.some((i) => i.key === imageKey(imageId)),
    [items]
  );

  const hasPlan = useCallback(
    (planId: string, categorySlugs: string[]) =>
      items.some((i) => i.key === planKey(planId, categorySlugs)),
    [items]
  );

  const totalCents = useMemo(
    () => items.reduce((sum, i) => sum + (i.price_cents || 0), 0),
    [items]
  );

  const value: CartContextValue = {
    items,
    count: items.length,
    totalCents,
    ready,
    hasImage,
    hasPlan,
    addImage,
    addPlan,
    removeItem,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
