let allPayments = [];
let allTransactions = [];

async function fetchPayments() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const txRes = await fetch('/api/transactions/buyer', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (txRes.ok) {
      const txData = await txRes.json();
      allTransactions = txData.transactions || [];
    }

    const response = await fetch('/api/payments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      allPayments = data.payments || [];
      
      allPayments.forEach(p => {
        const matchedTx = allTransactions.find(t => t.id === p.transactionId);
        if (matchedTx && matchedTx.lot && matchedTx.lot.farmer) {
          if (!p.transaction) p.transaction = {};
          if (!p.transaction.lot) p.transaction.lot = {};
          p.transaction.lot.farmer = matchedTx.lot.farmer;
        }
      });

      renderPayments(allPayments);
      updateKPIs(allPayments);
    }
  } catch (error) {
    console.error('Failed to fetch payments', error);
  }
}

function updateKPIs(payments) {
  const totalPurchase = payments.reduce((sum, p) => sum + p.amount, 0);
  const paid = payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);
  
  document.getElementById('kpi-total-purchase').textContent = `₹${totalPurchase.toLocaleString('en-IN')}`;
  document.getElementById('kpi-paid').textContent = `₹${paid.toLocaleString('en-IN')}`;
  document.getElementById('kpi-pending').textContent = `₹${pending.toLocaleString('en-IN')}`;
  document.getElementById('kpi-transactions').textContent = payments.length;
}

function renderPayments(payments) {
  const tbody = document.getElementById('paymentsTableBody');
  if (!tbody) return;

  if (payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4">No payments found</td></tr>`;
    return;
  }

  let html = '';
  payments.forEach(payment => {
    const txn = payment.transaction || {};
    const offer = txn.offer || {};
    const lot = txn.lot || {};
    const commodity = lot.commodity || { name: 'Unknown' };
    const farmer = lot.farmer || { name: 'Seller not specified' };
    
    const payIdDisplay = `PAY-${payment.id.substring(0, 6).toUpperCase()}`;
    const txnIdDisplay = `TXN-${txn.id.substring(0, 6).toUpperCase()}`;
    
    let statusHtml = '';
    if (payment.status === 'PENDING') {
      statusHtml = `<span class="inline-flex items-center gap-space-3xs bg-tertiary-fixed text-on-tertiary-container px-space-xs py-space-3xs rounded-full font-label-sm text-label-sm font-semibold">
        <span class="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span> Pending
      </span>`;
    } else {
      statusHtml = `<span class="inline-flex items-center gap-space-3xs bg-secondary-container text-on-secondary-container px-space-xs py-space-3xs rounded-full font-label-sm text-label-sm font-semibold">
        <span class="material-symbols-outlined text-[14px]">done</span> Paid
      </span>`;
    }

    const qty = offer.quantity ? `${offer.quantity} Q` : 'N/A';
    
    const dateVal = payment.createdAt ? new Date(payment.createdAt) : null;
    const dateDisplay = (dateVal && !isNaN(dateVal.getTime())) ? dateVal.toLocaleDateString('en-IN') : 'Not specified';

    html += `
      <tr class="hover:bg-surface-container-low/40 transition-colors">
        <td class="py-space-md px-space-md font-metric-mono text-metric-mono font-semibold text-primary">${payIdDisplay}</td>
        <td class="py-space-md px-space-md font-metric-mono text-metric-mono text-on-surface-variant">${txnIdDisplay}</td>
        <td class="py-space-md px-space-md">
          <div class="font-title-md text-title-md text-on-surface">${commodity.name}</div>
        </td>
        <td class="py-space-md px-space-md">
          <div class="flex items-center gap-space-2xs">
            <span class="font-title-md text-title-md text-on-surface">${farmer.name}</span>
          </div>
        </td>
        <td class="py-space-md px-space-md font-metric-mono text-metric-mono">${qty}</td>
        <td class="py-space-md px-space-md text-right font-metric-mono text-metric-mono font-bold text-primary">₹${payment.amount.toLocaleString('en-IN')}</td>
        <td class="py-space-md px-space-md font-body-sm text-body-sm text-on-surface-variant">${dateDisplay}</td>
        <td class="py-space-md px-space-md">${statusHtml}</td>
        <td class="py-space-md px-space-md text-center">
          ${payment.status === 'PENDING' ? `
          <button class="px-space-sm py-space-2xs bg-primary text-on-primary font-title-md text-title-md rounded transition-colors inline-flex items-center gap-space-3xs" onclick="simulatePayment('${payment.id}')">
            <span>Pay Now</span>
          </button>
          ` : `
          <button class="px-space-sm py-space-2xs bg-surface-container hover:bg-surface-container-high text-primary font-title-md text-title-md rounded transition-colors inline-flex items-center gap-space-3xs" onclick="showToast('Payment already completed', 'info')">
            <span class="">View</span>
            <span class="material-symbols-outlined text-[16px]">visibility</span>
          </button>
          `}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

async function simulatePayment(paymentId) {
  const token = sessionStorage.getItem('token');
  try {
    const res = await fetch(`/api/payments/${paymentId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    
    if (res.ok) {
      if (typeof showToast === 'function') {
        showToast('Payment simulated successfully! Settled to farmer.', 'success');
      } else {
        showToast('Payment simulated successfully!', 'success');
      }
      fetchPayments();
    }
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchPayments();
});
