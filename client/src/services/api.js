const API_BASE = 'https://shri-hari-sweets.onrender.com/api/orders';

export const fetchOrders = async () => {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
};

export const createOrder = async (orderData) => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create order");
  }
  return res.json();
};

export const updateOrder = async (id, orderData) => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update order");
  }
  return res.json();
};

export const deleteOrder = async (id) => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Failed to delete order");
  return res.json();
};

export const togglePaymentStatus = async (id) => {
  const res = await fetch(`${API_BASE}/${id}/toggle-payment`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error("Failed to toggle payment status");
  return res.json();
};

export const fetchOrdersPDFBlob = async () => {
  const res = await fetch(`${API_BASE}/download-pdf`);
  if (!res.ok) throw new Error("Failed to download PDF report");
  return res.blob();
};

const SETTINGS_API_BASE = 'https://shri-hari-sweets.onrender.com/api/settings';

export const fetchUpiIdSetting = async () => {
  const res = await fetch(`${SETTINGS_API_BASE}/upiId`);
  if (!res.ok) throw new Error("Failed to fetch UPI ID");
  const data = await res.json();
  return data.value || '';
};

export const updateUpiIdSetting = async (upiId) => {
  const res = await fetch(`${SETTINGS_API_BASE}/upiId`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: upiId })
  });
  if (!res.ok) throw new Error("Failed to update UPI ID");
  return res.json();
};

