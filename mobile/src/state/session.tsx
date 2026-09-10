import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { CartItem, DemoCustomer } from '../api/types';

type SessionValue = {
  customer: DemoCustomer;
  customers: DemoCustomer[];
  setCustomer: (c: DemoCustomer) => void;
  cart: CartItem[];
  refreshCart: () => Promise<void>;
  add: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const customers = useMemo(() => api.customers(), []);
  const [customer, setCustomer] = useState<DemoCustomer>(customers[0]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const refreshCart = useCallback(async () => {
    setCart(await api.cart(customer.id));
  }, [customer.id]);

  // The cart belongs to the customer, so switching customers reloads it.
  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const add = useCallback(
    async (productId: string, quantity: number) => {
      setCart(await api.addToCart(customer.id, productId, quantity));
    },
    [customer.id],
  );

  const remove = useCallback(
    async (productId: string) => {
      setCart(await api.removeFromCart(customer.id, productId));
    },
    [customer.id],
  );

  const value = { customer, customers, setCustomer, cart, refreshCart, add, remove };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
