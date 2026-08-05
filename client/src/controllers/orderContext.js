import { createContext, useContext } from 'react';

/* Lifecycle of the order list.
   loading  → first load, nothing to show yet (skeletons)
   ready    → we have data (may still be refreshing in the background)
   error    → first load failed and we have nothing to show (error screen) */
export const STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

export const OrderContext = createContext(null);

export const useOrderController = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderController must be used within an OrderProvider');
  }
  return context;
};
