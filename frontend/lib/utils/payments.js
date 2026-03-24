export const getReceiptUrl = (payment) => {
  if (!payment?.id || !payment?.created_at) return null;
  const y = new Date(payment.created_at).getFullYear();
  const num = `RCP-${y}-${String(payment.id).slice(0, 8).toUpperCase()}`;
  return `/receipts/${num}`;
};

export const mergeRecordsWithPayments = (records = [], payments = []) => {
  const map = new Map();
  for (const p of payments) {
    if (p.payment_status !== "completed") continue;
    if (!p.monthly_record_id) continue;
    if (!map.has(p.monthly_record_id)) {
      map.set(p.monthly_record_id, p);
    }
  }

  return records.map((r) => {
    const p = map.get(r.id) || null;
    return {
      ...r,
      payment_mode: p?.payment_mode || null,
      payment_status: p?.payment_status || null,
      payment_date: p?.payment_date || null,
      receipt_url: p ? getReceiptUrl(p) : null,
    };
  });
};
