let allPayments = [];

async function fetchPayments() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('/api/payments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      allPayments = data.payments || [];
      renderPayments(allPayments);
      updateKPIs(allPayments);
    }
  } catch (error) {
    console.error('Failed to fetch payments', error);
  }
}

function updateKPIs(payments) {
  const totalValue = payments.reduce((sum, p) => sum + p.amount, 0);
  const paid = payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);
  const completedCount = payments.filter(p => p.status === 'COMPLETED').length;
  
  document.getElementById('kpi-total-transaction-value').textContent = `₹${totalValue.toLocaleString('en-IN')}`;
  document.getElementById('kpi-received').textContent = `₹${paid.toLocaleString('en-IN')}`;
  document.getElementById('kpi-pending').textContent = `₹${pending.toLocaleString('en-IN')}`;
  document.getElementById('kpi-completed-payments').textContent = completedCount;

  const total = paid + pending;
  const paidPct = total > 0 ? (paid / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;

  document.getElementById('progressBarReceived').style.width = `${paidPct}%`;
  document.getElementById('progressBarPending').style.width = `${pendingPct}%`;

  document.getElementById('progressTextReceived').textContent = `Received: ₹${paid.toLocaleString('en-IN')} (${paidPct.toFixed(1)}%)`;
  document.getElementById('progressTextPending').textContent = `Pending: ₹${pending.toLocaleString('en-IN')} (${pendingPct.toFixed(1)}%)`;
}

function renderPayments(payments) {
  const tbody = document.getElementById('paymentHistoryTableBody');
  const pendingContainer = document.getElementById('pendingPaymentsContainer');

  const pendingPayments = payments.filter(p => p.status === 'PENDING');
  const completedPayments = payments.filter(p => p.status === 'COMPLETED');

  if (pendingContainer) {
    if (pendingPayments.length === 0) {
      pendingContainer.innerHTML = `<div class="p-space-lg rounded-xl bg-surface-container-lowest text-center text-on-surface-variant">No pending payments</div>`;
    } else {
      let pendingHtml = '';
      pendingPayments.forEach(payment => {
        const txn = payment.transaction || {};
        const offer = txn.offer || {};
        const lot = txn.lot || {};
        const commodity = lot.commodity || { name: 'Unknown' };
        const buyer = txn.offer?.fromUser || { name: 'Unknown Buyer' };
        
        const payIdDisplay = `PAY-${payment.id.substring(0, 6).toUpperCase()}`;
        const txnIdDisplay = `TXN-${txn.id.substring(0, 6).toUpperCase()}`;
        const qty = offer.quantity ? `${offer.quantity} Quintals` : 'N/A';

        pendingHtml += `
          <div class="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div class="flex flex-col gap-space-xs max-w-2xl">
              <div class="flex items-center gap-space-sm flex-wrap">
                <span class="font-metric-mono text-metric-mono font-bold text-primary">${txnIdDisplay}</span>
                <span class="px-space-xs py-space-3xs rounded-full bg-tertiary-fixed text-on-tertiary-container font-label-sm text-label-sm font-semibold">
                  Payment Pending
                </span>
                <span class="font-body-sm text-body-sm text-on-surface font-semibold">${commodity.name} • ${qty}</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-xs text-left pt-space-xs">
                <div>
                  <span class="font-label-sm text-label-sm text-on-surface-variant block uppercase">Buyer</span>
                  <span class="font-body-md text-body-md font-semibold text-primary">${buyer.name}</span>
                </div>
                <div>
                  <span class="font-label-sm text-label-sm text-on-surface-variant block uppercase">Agreed Price & Terms</span>
                  <span class="font-body-md text-body-md font-semibold text-primary">₹${txn.agreedPrice || 0} / Quintal</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant block">Within 3 business days of delivery</span>
                </div>
              </div>
              <div class="flex items-center gap-space-md text-on-surface-variant font-body-sm pt-space-2xs flex-wrap">
                <span class="">Total Value: <strong class="text-primary font-semibold">₹${payment.amount.toLocaleString('en-IN')}</strong></span>
                <span class="">•</span>
                <span class="">Received: <strong class="text-on-surface font-medium">₹0</strong></span>
                <span class="">•</span>
                <span class="">Pending: <strong class="text-secondary font-bold">₹${payment.amount.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
            <div class="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-space-sm shrink-0">
              <div class="flex flex-col items-start lg:items-end">
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Amount Pending</span>
                <span class="font-title-lg text-title-lg font-bold text-primary">₹${payment.amount.toLocaleString('en-IN')}</span>
              </div>
              <button class="px-space-md py-space-xs rounded-lg bg-primary-container text-white font-label-md text-label-md font-semibold hover:bg-primary transition-colors shadow-sm flex items-center gap-space-2xs" onclick="showToast('Awaiting buyer settlement', 'info')">
                <span class="">View Transaction</span>
                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        `;
      });
      pendingContainer.innerHTML = pendingHtml;
    }
  }

  if (tbody) {
    if (completedPayments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4">No completed payments found</td></tr>`;
    } else {
      let historyHtml = '';
      completedPayments.forEach(payment => {
        const txn = payment.transaction || {};
        const offer = txn.offer || {};
        const lot = txn.lot || {};
        const commodity = lot.commodity || { name: 'Unknown' };
        const buyer = txn.offer?.fromUser || { name: 'Unknown Buyer' };
        
        const payIdDisplay = `PAY-${payment.id.substring(0, 6).toUpperCase()}`;
        const txnIdDisplay = `TXN-${txn.id.substring(0, 6).toUpperCase()}`;
        const qty = offer.quantity ? `${offer.quantity} Qtl` : 'N/A';

        historyHtml += `
          <tr class="hover:bg-surface-container-low transition-colors">
            <td class="py-space-sm px-space-sm font-metric-mono font-bold text-primary">${payIdDisplay}</td>
            <td class="py-space-sm px-space-sm font-metric-mono text-on-surface-variant">${txnIdDisplay}</td>
            <td class="py-space-sm px-space-sm font-semibold text-primary">${buyer.name}</td>
            <td class="py-space-sm px-space-sm text-on-surface">${commodity.name} (${qty})</td>
            <td class="py-space-sm px-space-sm text-on-surface-variant">₹${txn.agreedPrice || 0} / Qtl</td>
            <td class="py-space-sm px-space-sm font-bold text-primary">₹${payment.amount.toLocaleString('en-IN')}</td>
            <td class="py-space-sm px-space-sm text-on-surface-variant">${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN') : 'Not available'}</td>
            <td class="py-space-sm px-space-sm text-on-surface-variant">${payment.paymentMethod || 'Simulated Digital Settlement'}</td>
            <td class="py-space-sm px-space-sm">
              <span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs">
                <span class="material-symbols-outlined text-[14px]">check_circle</span> Completed
              </span>
            </td>
            <td class="py-space-sm px-space-sm text-right">
              <button class="px-space-sm py-space-3xs rounded bg-surface-container-low text-primary font-label-sm font-semibold hover:bg-surface-container transition-colors" onclick="showToast('Viewing receipt', 'info')">
                View Receipt
              </button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = historyHtml;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchPayments();
});
