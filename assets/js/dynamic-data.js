document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  const path = window.location.pathname;

  const fetchApi = async (url, options = {}) => {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }
      });
      if (res.ok) return await res.json();
      console.error('API Error:', await res.text());
    } catch (e) {
      console.error('Fetch error:', e);
    }
    return null;
  };

  const emptyRow = (colSpan, text = 'No records yet') => `<tr><td colspan="${colSpan}" class="text-center py-8 text-on-surface-variant">${text}</td></tr>`;

  // Helper to replace tbody content
  const replaceTableBody = (selector, html) => {
    const table = document.querySelector(selector);
    if (table) {
      const tbody = table.querySelector('tbody') || table;
      if (tbody.tagName === 'TBODY' || tbody.tagName === 'TABLE') {
        tbody.innerHTML = html;
      }
    }
  };

  // ================= FARMER PAGES =================

  if (path.includes('/farmer/payments')) {
    const data = await fetchApi('/api/payments');
    if (data && data.payments) {
      const html = data.payments.length === 0 ? emptyRow(10) : data.payments.map(p => `
        <tr class="hover:bg-surface-container-low transition-colors">
          <td class="py-space-sm px-space-sm font-metric-mono font-bold text-primary">${p.id.split('-')[0]}</td>
          <td class="py-space-sm px-space-sm font-metric-mono text-on-surface-variant">${p.transactionId.split('-')[0]}</td>
          <td class="py-space-sm px-space-sm font-semibold text-primary">${p.transaction.offer?.fromUser?.buyerProfile?.companyName || 'Buyer'}</td>
          <td class="py-space-sm px-space-sm text-on-surface">${p.transaction.lot?.commodity?.name || 'Produce'}</td>
          <td class="py-space-sm px-space-sm text-on-surface-variant">₹${p.transaction.agreedPrice} / Qtl</td>
          <td class="py-space-sm px-space-sm font-bold text-primary">₹${p.amount}</td>
          <td class="py-space-sm px-space-sm text-on-surface-variant">${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'Pending'}</td>
          <td class="py-space-sm px-space-sm text-on-surface-variant">${p.paymentMethod || 'Bank Transfer'}</td>
          <td class="py-space-sm px-space-sm">
            <span class="px-space-xs py-space-3xs rounded-full ${p.status === 'COMPLETED' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'} font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs">
              ${p.status}
            </span>
          </td>
          <td class="py-space-sm px-space-sm text-right">
            <button class="px-space-sm py-space-3xs rounded bg-surface-container-low text-primary font-label-sm font-semibold hover:bg-surface-container transition-colors">View Receipt</button>
          </td>
        </tr>
      `).join('');
      replaceTableBody('table', html);
    }
  }

  else if (path.includes('/farmer/offers-transactions')) {
    const txData = await fetchApi('/api/transactions/farmer');
    if (txData && txData.transactions) {
      // Find the Active Transactions table
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) {
        // Assuming the last table or the one with specific headers is the transaction table
        // We'll replace all tables or find the specific one. Let's just replace the first table we find that looks like transactions
        const txTable = tables[tables.length - 1]; 
        const html = txData.transactions.length === 0 ? emptyRow(8) : txData.transactions.map(t => `
          <tr class="hover:bg-surface-container-low transition-colors">
            <td class="py-space-sm px-space-sm font-metric-mono font-bold text-primary">${t.id.split('-')[0]}</td>
            <td class="py-space-sm px-space-sm font-semibold text-primary">${t.offer?.fromUser?.buyerProfile?.companyName || 'Buyer'}</td>
            <td class="py-space-sm px-space-sm text-on-surface">${t.lot?.commodity?.name || 'Produce'}</td>
            <td class="py-space-sm px-space-sm text-on-surface-variant">₹${t.agreedPrice} / Qtl</td>
            <td class="py-space-sm px-space-sm font-bold text-primary">₹${t.totalAmount}</td>
            <td class="py-space-sm px-space-sm text-on-surface-variant">${new Date(t.createdAt).toLocaleDateString()}</td>
            <td class="py-space-sm px-space-sm">
              <span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs">
                ${t.status}
              </span>
            </td>
            <td class="py-space-sm px-space-sm text-right">
              <button class="px-space-sm py-space-3xs rounded bg-surface-container-low text-primary font-label-sm font-semibold hover:bg-surface-container transition-colors">View Details</button>
            </td>
          </tr>
        `).join('');
        replaceTableBody(txTable ? 'table:last-of-type' : 'table', html);
      }
    }
  }

  else if (path.includes('/farmer/logistics-storage')) {
    const txData = await fetchApi('/api/transactions/farmer');
    if (txData && txData.transactions) {
      const html = txData.transactions.length === 0 ? emptyRow(8) : txData.transactions.map(t => `
        <tr class="hover:bg-surface-container-low transition-colors">
          <td class="py-space-sm px-space-sm font-metric-mono font-bold text-primary">${t.logistics?.id?.split('-')[0] || 'Pending'}</td>
          <td class="py-space-sm px-space-sm font-metric-mono text-on-surface-variant">${t.id.split('-')[0]}</td>
          <td class="py-space-sm px-space-sm text-on-surface">${t.lot?.commodity?.name || 'Produce'}</td>
          <td class="py-space-sm px-space-sm text-on-surface-variant">${t.logistics?.carrierName || 'TBD'}</td>
          <td class="py-space-sm px-space-sm text-on-surface-variant">${t.logistics?.vehicleNumber || 'TBD'}</td>
          <td class="py-space-sm px-space-sm text-on-surface-variant">${t.logistics?.pickupDate ? new Date(t.logistics.pickupDate).toLocaleDateString() : 'TBD'}</td>
          <td class="py-space-sm px-space-sm">
            <span class="px-space-xs py-space-3xs rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs">
              ${t.logistics?.status || 'PENDING'}
            </span>
          </td>
          <td class="py-space-sm px-space-sm text-right">
            <button class="px-space-sm py-space-3xs rounded bg-surface-container-low text-primary font-label-sm font-semibold hover:bg-surface-container transition-colors">Track</button>
          </td>
        </tr>
      `).join('');
      replaceTableBody('table', html);
    }
  }

  else if (path.includes('/farmer/grievances')) {
    const data = await fetchApi('/api/grievances');
    if (data && data.grievances) {
      const html = data.grievances.length === 0 ? emptyRow(6) : data.grievances.map(g => `
        <tr class="hover:bg-surface-container-low transition-colors">
          <td class="py-space-sm px-space-sm font-metric-mono font-bold text-primary">${g.id.split('-')[0]}</td>
          <td class="py-space-sm px-space-sm font-metric-mono text-on-surface-variant">${g.transactionId.split('-')[0]}</td>
          <td class="py-space-sm px-space-sm text-on-surface">${g.type}</td>
          <td class="py-space-sm px-space-sm text-on-surface-variant">${new Date(g.createdAt).toLocaleDateString()}</td>
          <td class="py-space-sm px-space-sm">
            <span class="px-space-xs py-space-3xs rounded-full ${g.status === 'OPEN' ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface-variant'} font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs">
              ${g.status}
            </span>
          </td>
          <td class="py-space-sm px-space-sm text-right">
            <button class="px-space-sm py-space-3xs rounded bg-surface-container-low text-primary font-label-sm font-semibold hover:bg-surface-container transition-colors">View Status</button>
          </td>
        </tr>
      `).join('');
      replaceTableBody('table', html);
    }
  }

  // ================= BUYER PAGES =================



  else if (path.includes('/buyer/offers-transactions')) {
    const txData = await fetchApi('/api/transactions/buyer');
    if (txData && txData.transactions) {
      const tables = document.querySelectorAll('table');
      const txTable = tables[tables.length - 1]; 
      if (txTable) {
        const html = txData.transactions.length === 0 ? emptyRow(8) : txData.transactions.map(t => `
          <tr class="hover:bg-surface-container-low transition-colors">
            <td class="py-space-sm px-space-sm font-metric-mono font-bold text-primary">${t.id.split('-')[0]}</td>
            <td class="py-space-sm px-space-sm font-semibold text-primary">${t.lot?.farmer?.name || 'Farmer'}</td>
            <td class="py-space-sm px-space-sm text-on-surface">${t.lot?.commodity?.name || 'Produce'}</td>
            <td class="py-space-sm px-space-sm text-on-surface-variant">₹${t.agreedPrice} / Qtl</td>
            <td class="py-space-sm px-space-sm font-bold text-primary">₹${t.totalAmount}</td>
            <td class="py-space-sm px-space-sm text-on-surface-variant">${new Date(t.createdAt).toLocaleDateString()}</td>
            <td class="py-space-sm px-space-sm">
              <span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs">
                ${t.status}
              </span>
            </td>
            <td class="py-space-sm px-space-sm text-right">
              <button class="px-space-sm py-space-3xs rounded bg-surface-container-low text-primary font-label-sm font-semibold hover:bg-surface-container transition-colors">View Details</button>
            </td>
          </tr>
        `).join('');
        replaceTableBody('table:last-of-type', html);
      }
    }
  }
  


});
