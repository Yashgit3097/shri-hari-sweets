import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  togglePaymentStatus,
  fetchOrdersPDFBlob,
} from '../services/api';
import { socket } from '../services/socket';
import { OrderContext, STATUS } from './orderContext';

const TOAST_DURATION = 4000;
const TOAST_EXIT = 200;

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState(null);

  /* Background refetch — data is already on screen, so no skeletons. */
  const [refreshing, setRefreshing] = useState(false);

  /* connecting | live | offline */
  const [connection, setConnection] = useState('connecting');

  /* Per-row work: { [orderId]: 'toggle' | 'delete' } */
  const [rowPending, setRowPending] = useState({});

  /* Modal form submit */
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'data'
  const [modal, setModal] = useState({ open: false, order: null });
  const [toasts, setToasts] = useState([]);

  const timersRef = useRef(new Map());
  const hasConnectedOnce = useRef(false);
  const ordersRef = useRef([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  /* ───────────────── Toasts ───────────────── */

  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    const exitTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(`exit-${id}`);
    }, TOAST_EXIT);
    timersRef.current.set(`exit-${id}`, exitTimer);
  }, []);

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, type, exiting: false }]);
      const timer = setTimeout(() => dismissToast(id), TOAST_DURATION);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismissToast]
  );

  /* ───────────────── Data loading ───────────────── */

  const loadOrders = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setStatus((prev) => (prev === STATUS.READY ? prev : STATUS.LOADING));

    try {
      const data = await fetchOrders();
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
      setStatus(STATUS.READY);
      return true;
    } catch (err) {
      const message =
        err?.message === 'Failed to fetch'
          ? 'Cannot reach the server. Check that the backend is running.'
          : err?.message || 'Something went wrong while loading orders.';
      setError(message);
      /* Only blank the screen if we have nothing to fall back to. */
      setStatus(ordersRef.current.length ? STATUS.READY : STATUS.ERROR);
      return false;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const retry = useCallback(() => loadOrders(), [loadOrders]);

  /* ───────────────── Boot + realtime ───────────────── */

  /* eslint-disable react-hooks/set-state-in-effect --
     This effect is exactly what effects are for: kick off the first fetch and
     mirror the socket's state into React. Both legitimately set state. */
  useEffect(() => {
    loadOrders();

    const onConnect = () => {
      setConnection('live');
      if (hasConnectedOnce.current) {
        showToast('Back online — data is live again.', 'success');
        loadOrders({ silent: true });
      }
      hasConnectedOnce.current = true;
    };

    const onDisconnect = () => {
      setConnection('offline');
      showToast('Connection lost. Trying to reconnect…', 'warning');
    };

    const onConnectError = () => setConnection('offline');

    const onDataUpdated = (updatedOrders) => {
      if (!Array.isArray(updatedOrders)) return;
      setOrders(updatedOrders);
      setError(null);
      setStatus(STATUS.READY);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('data-updated', onDataUpdated);

    if (socket.connected) onConnect();

    const timers = timersRef.current;
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('data-updated', onDataUpdated);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [loadOrders, showToast]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ───────────────── Row-level pending helpers ───────────────── */

  const markRow = useCallback((id, action) => {
    setRowPending((prev) => ({ ...prev, [id]: action }));
  }, []);

  const clearRow = useCallback((id) => {
    setRowPending((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /* ───────────────── Modal ───────────────── */

  const openOrderModal = useCallback((order = null) => {
    setModal({ open: true, order });
  }, []);

  const closeOrderModal = useCallback(() => {
    setModal((prev) => ({ ...prev, open: false }));
  }, []);

  /* ───────────────── Mutations ───────────────── */

  const addOrder = useCallback(
    async (orderData) => {
      setSubmitting(true);
      try {
        const created = await createOrder(orderData);
        /* Socket normally pushes the new list; patch locally so the UI
           never sits there looking like nothing happened. */
        if (created && (created._id || created.id)) {
          setOrders((prev) =>
            prev.some((o) => (o._id || o.id) === (created._id || created.id))
              ? prev
              : [created, ...prev]
          );
        }
        showToast(`Order for ${orderData.customerName} created.`, 'success');
        return created;
      } catch (err) {
        showToast(err?.message || 'Could not create the order.', 'error');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast]
  );

  const editOrder = useCallback(
    async (id, orderData) => {
      setSubmitting(true);
      try {
        const updated = await updateOrder(id, orderData);
        if (updated) {
          setOrders((prev) =>
            prev.map((o) => ((o._id || o.id) === id ? { ...o, ...updated } : o))
          );
        }
        showToast('Order updated.', 'success');
        return updated;
      } catch (err) {
        showToast(err?.message || 'Could not save your changes.', 'error');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [showToast]
  );

  const removeOrder = useCallback(
    async (id) => {
      markRow(id, 'delete');
      try {
        await deleteOrder(id);
        setOrders((prev) => prev.filter((o) => (o._id || o.id) !== id));
        showToast('Order deleted.', 'success');
      } catch (err) {
        showToast(err?.message || 'Could not delete the order.', 'error');
        throw err;
      } finally {
        clearRow(id);
      }
    },
    [markRow, clearRow, showToast]
  );

  const toggleOrderPayment = useCallback(
    async (id) => {
      if (rowPending[id]) return;
      markRow(id, 'toggle');

      /* Optimistic flip — reverted if the request fails. */
      let previous;
      setOrders((prev) =>
        prev.map((o) => {
          if ((o._id || o.id) !== id) return o;
          previous = o.status;
          return { ...o, status: o.status === 'paid' ? 'unpaid' : 'paid' };
        })
      );

      try {
        const updated = await togglePaymentStatus(id);
        if (updated?.status) {
          setOrders((prev) =>
            prev.map((o) =>
              (o._id || o.id) === id ? { ...o, status: updated.status } : o
            )
          );
          showToast(
            updated.status === 'paid' ? 'Marked as paid.' : 'Marked as unpaid.',
            'success'
          );
        }
      } catch (err) {
        setOrders((prev) =>
          prev.map((o) => ((o._id || o.id) === id ? { ...o, status: previous } : o))
        );
        showToast(err?.message || 'Could not update the payment status.', 'error');
      } finally {
        clearRow(id);
      }
    },
    [rowPending, markRow, clearRow, showToast]
  );

  const downloadPDF = useCallback(async () => {
    setDownloadingPdf(true);
    showToast('Preparing your PDF report...', 'info');
    try {
      const blob = await fetchOrdersPDFBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `shri_hari_sweets_report_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      showToast(err?.message || 'Could not download the PDF.', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  }, [showToast]);

  return (
    <OrderContext.Provider
      value={{
        /* data */
        orders,
        /* status */
        status,
        loading: status === STATUS.LOADING,
        refreshing,
        error,
        connection,
        rowPending,
        submitting,
        downloadingPdf,
        /* navigation */
        activeTab,
        setActiveTab,
        /* modal */
        modal,
        openOrderModal,
        closeOrderModal,
        /* toasts */
        toasts,
        showToast,
        dismissToast,
        /* actions */
        retry,
        refresh: () => loadOrders({ silent: true }),
        addOrder,
        editOrder,
        removeOrder,
        toggleOrderPayment,
        downloadPDF,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};
