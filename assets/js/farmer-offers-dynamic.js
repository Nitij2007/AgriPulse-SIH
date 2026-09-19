let allFarmerOffers = [];
let allFarmerTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await fetchFarmerOffers();
  await fetchFarmerTransactions();
});

async function fetchFarmerOffers() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('/api/offers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch offers');
    const data = await res.json();

        // Contextual Filter Population
        try {
            const findCommodities = (obj) => {
                let comms = new Set();
                const traverse = (o) => {
                    if (typeof o !== 'object' || o === null) return;
                    if (o.commodity && o.commodity.name) comms.add(o.commodity.name);
                    if (o.commodityName) comms.add(o.commodityName);
                    Object.values(o).forEach(traverse);
                };
                traverse(obj);
                return Array.from(comms).sort();
            };
            const uniqueComms = findCommodities(data);
            document.querySelectorAll('.contextual-produce-filter').forEach(filterSelect => {
                const currentVal = filterSelect.value;
                filterSelect.innerHTML = '<option value="">All Produce</option>' + uniqueComms.map(c => `<option value="${c}">${c}</option>`).join('');
                if (uniqueComms.includes(currentVal)) filterSelect.value = currentVal;
            });
        } catch(e) { console.error('Filter pop error', e); }

    
    // For farmer, we want offers made TO their lots
    // In a real app we'd filter by checking if we own the lot, but since this API returns 
    // offers made by OR to the user, and a farmer wouldn't typically make offers to themselves, 
    // we can assume if the user is a farmer, these are incoming offers (or we can just show them all).
    // Let's filter to ensure it has a lot.
    allFarmerOffers = data.offers.filter(o => o.lot);
    
    renderFarmerOffers();
    renderFarmerComparativeTable();
    updateFarmerOfferMetrics();
  } catch (err) {
    console.error('Error fetching farmer offers:', err);
    if (typeof showToast === 'function') {
      showToast('Could not load offers', 'error');
    }
  }
}

function renderFarmerOffers() {
  const container = document.getElementById('farmerOffersContainer');
  if (!container) return;

  if (allFarmerOffers.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-space-xl text-center rounded-xl bg-surface-container-low border border-surface-container-high border-dashed">
        <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-space-sm">inbox</span>
        <h3 class="font-title-md text-title-md text-on-surface font-semibold mb-space-2xs">No incoming offers yet</h3>
        <p class="font-body-md text-body-md text-on-surface-variant">When buyers make offers on your lots, they will appear here.</p>
      </div>
    `;
    return;
  }

  // Sort by newest first
  const sortedOffers = [...allFarmerOffers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let html = '';
  sortedOffers.forEach(offer => {
    const lot = offer.lot || {};
    const commodity = lot.commodity || {};
    const buyerProfile = offer.fromUser?.buyerProfile || {};
    
    const offerIdDisplay = `#OFF-${offer.id.substring(0, 6).toUpperCase()}`;
    const lotIdDisplay = lot.id ? `#AP-${commodity.name?.substring(0,2).toUpperCase()}-${lot.id.substring(0, 3)}` : 'N/A';
    const commodityName = commodity.name || 'Unknown Produce';
    const buyerName = buyerProfile.companyName || offer.fromUser?.name || 'Unknown Buyer';
    const location = buyerProfile.location || 'Location unknown';
    
    const quantity = offer.quantity;
    const offeredPrice = offer.offeredPrice;
    const totalValue = quantity * offeredPrice;
    
    const lotListingPrice = lot.listingPrice || 0;
    const parity = offeredPrice - lotListingPrice;
    let parityHtml = '';
    if (lotListingPrice > 0) {
      if (parity >= 0) {
        parityHtml = `
          <span class="px-space-sm py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">trending_up</span> High Parity (+₹${parity}/Qtl)
          </span>`;
      } else {
        parityHtml = `
          <span class="px-space-sm py-space-3xs rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">trending_down</span> Below Parity (-₹${Math.abs(parity)}/Qtl)
          </span>`;
      }
    } else {
      parityHtml = `
        <span class="px-space-sm py-space-3xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">balance</span> Competitive Bid
        </span>`;
    }

    let statusHtml = '';
    if (offer.status === 'PENDING') statusHtml = `<span class="px-space-xs py-space-3xs rounded bg-amber-50 text-amber-800 font-label-sm font-semibold border border-amber-200">Pending Review</span>`;
    else if (offer.status === 'ACCEPTED') statusHtml = `<span class="px-space-xs py-space-3xs rounded bg-emerald-50 text-emerald-800 font-label-sm font-semibold border border-emerald-200">Accepted</span>`;
    else if (offer.status === 'REJECTED') statusHtml = `<span class="px-space-xs py-space-3xs rounded bg-rose-50 text-rose-800 font-label-sm font-semibold border border-rose-200">Rejected</span>`;
    else statusHtml = `<span class="px-space-xs py-space-3xs rounded bg-surface-container text-on-surface font-label-sm font-semibold">${offer.status}</span>`;

    html += `
      <div class="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden relative">
        <div class="p-space-lg flex-1 flex flex-col justify-between space-y-space-md">
          <div class="space-y-space-xs">
            <div class="flex items-center justify-between gap-space-xs flex-wrap">
              ${parityHtml}
              <span class="font-metric-mono text-label-sm text-on-surface-variant">Offer ${offerIdDisplay}</span>
            </div>
            <div>
              <div class="flex items-center gap-space-xs">
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Lot ${lotIdDisplay}</span>
                ${statusHtml}
              </div>
              <h3 class="font-title-lg text-title-lg text-primary font-bold mt-1">${commodityName} (${lot.grade || 'Standard'})</h3>
            </div>
          </div>
          
          <div class="p-space-sm rounded-lg bg-surface-container-low flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary flex-shrink-0">
              <span class="material-symbols-outlined text-[22px]">apartment</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-space-2xs">
                <span class="font-title-md text-title-md font-bold text-on-surface truncate">${buyerName}</span>
                
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant">${location}</p>
            </div>
          </div>

          <div class="space-y-space-xs">
            <div class="grid grid-cols-2 gap-space-sm p-space-sm rounded-lg bg-surface-bright">
              <div class="flex flex-col">
                <span class="font-label-sm text-label-sm text-on-surface-variant">Target Minimum</span>
                <span class="font-metric-mono text-title-md font-bold text-on-surface ${parity >= 0 ? 'line-through text-opacity-60' : ''}">₹ ${lotListingPrice.toLocaleString('en-IN')} <span class="text-body-sm font-normal text-on-surface-variant">/Qtl</span></span>
              </div>
              <div class="flex flex-col">
                <span class="font-label-sm text-label-sm text-secondary font-semibold">Offered Bid Price</span>
                <span class="font-metric-mono text-headline-sm font-bold text-secondary">₹ ${offeredPrice.toLocaleString('en-IN')} <span class="text-body-sm font-normal text-on-surface-variant">/Qtl</span></span>
              </div>
            </div>
            
            <div class="flex items-center justify-between px-space-sm py-space-xs rounded-lg bg-surface-container-low">
              <div class="flex flex-col">
                <span class="font-label-sm text-label-sm text-on-surface-variant">Volume: <strong>${quantity} Quintals</strong></span>
              </div>
              <div class="flex flex-col text-right">
                <span class="font-label-sm text-label-sm text-on-surface-variant">Total Deal Value</span>
                <span class="font-metric-mono text-title-lg font-bold text-primary">₹ ${totalValue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="p-space-md bg-surface-container-low flex items-center gap-space-xs">
          ${offer.status === 'PENDING' ? `
            <button onclick="handleAcceptOffer('${offer.id}')" class="flex-1 h-11 px-space-md rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-space-2xs shadow-sm cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">handshake</span> Accept
            </button>
            <button onclick="handleRejectOffer('${offer.id}')" class="h-11 w-11 rounded-lg bg-surface-container-lowest text-error font-label-md text-label-md font-semibold hover:bg-error-container hover:text-on-error-container transition-colors flex items-center justify-center shadow-sm cursor-pointer" title="Decline Offer">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          ` : `
            <div class="flex-1 flex items-center justify-center py-2">
              <span class="font-label-md text-label-md text-on-surface-variant font-medium">No actions available</span>
            </div>
          `}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function updateFarmerOfferMetrics() {
  const pending = allFarmerOffers.filter(o => o.status === 'PENDING').length;
  const accepted = allFarmerOffers.filter(o => o.status === 'ACCEPTED').length;
  
  // Realized volume from settled transactions (or all if simulated)
  const realizedVolume = allFarmerTransactions.reduce((sum, txn) => sum + (txn.totalAmount || 0), 0);
  let formattedVolume = '₹ 0';
  if (realizedVolume >= 100000) {
    formattedVolume = '₹ ' + (realizedVolume / 100000).toFixed(2) + ' L';
  } else if (realizedVolume > 0) {
    formattedVolume = '₹ ' + realizedVolume.toLocaleString('en-IN');
  }
  
  const pendingEl = document.getElementById('metricPendingOffers');
  if (pendingEl) pendingEl.textContent = pending;
  
  const totalEl = document.getElementById('metricTotalReceived');
  if (totalEl) totalEl.textContent = allFarmerOffers.length;

  const acceptedEl = document.getElementById('metricAcceptedDeals');
  if (acceptedEl) acceptedEl.textContent = accepted;

  const realizedEl = document.getElementById('metricRealizedVolume');
  if (realizedEl) realizedEl.textContent = formattedVolume;

  // Update tab counts
  const countAll = document.getElementById('count-all');
  if (countAll) countAll.textContent = `(${allFarmerOffers.length})`;
  const countPending = document.getElementById('count-pending');
  if (countPending) countPending.textContent = `(${pending})`;
  const countAccepted = document.getElementById('count-accepted');
  if (countAccepted) countAccepted.textContent = `(${accepted})`;
  const countRejected = document.getElementById('count-rejected');
  if (countRejected) countRejected.textContent = `(${allFarmerOffers.filter(o => o.status === 'REJECTED').length})`;
  const countExpired = document.getElementById('count-expired');
  if (countExpired) countExpired.textContent = `(${allFarmerOffers.filter(o => o.status === 'EXPIRED').length})`;
  const countCountered = document.getElementById('count-countered');
  if (countCountered) countCountered.textContent = `(${allFarmerOffers.filter(o => o.status === 'COUNTERED').length})`;
}

function renderFarmerComparativeTable() {
  const tbody = document.getElementById('farmerComparativeTableBody');
  if (!tbody) return;
  if (allFarmerOffers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-space-xl px-space-md text-center text-on-surface-variant font-medium">No offers available for comparison.</td></tr>`;
    return;
  }

  let html = '';
  allFarmerOffers.forEach(offer => {
    const lot = offer.lot || {};
    const commodity = lot.commodity || {};
    const buyerProfile = offer.fromUser?.buyerProfile || {};
    
    const buyerName = buyerProfile.companyName || offer.fromUser?.name || 'Unknown Buyer';
    const location = buyerProfile.location || 'Location unknown';
    const commodityName = commodity.name || 'Unknown Produce';
    const lotIdDisplay = lot.id ? `#AP-${commodityName.substring(0,2).toUpperCase()}-${lot.id.substring(0, 3)}` : 'N/A';
    
    const quantity = offer.quantity;
    const offeredPrice = offer.offeredPrice;
    const totalValue = quantity * offeredPrice;
    const lotListingPrice = lot.listingPrice || 0;
    const parity = offeredPrice - lotListingPrice;

    html += `
      <tr class="hover:bg-surface-container-low transition-colors">
        <td class="py-space-md px-space-md">
          <div class="flex items-center gap-space-xs">
            <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
              <span class="material-symbols-outlined text-[16px]">apartment</span>
            </div>
            <div>
              <div class="font-title-md text-label-md font-bold text-primary flex items-center gap-1">
                ${buyerName}
                
              </div>
              <span class="font-label-sm text-label-sm text-on-surface-variant">${location}</span>
            </div>
          </div>
        </td>
        <td class="py-space-md px-space-md">
          <div class="font-medium text-on-surface">${lotIdDisplay}</div>
          <div class="text-on-surface-variant">${commodityName} • ${quantity} Qtl</div>
        </td>
        <td class="py-space-md px-space-md">
          <span class="px-space-xs py-space-3xs rounded bg-surface-container text-primary font-label-sm text-label-sm font-semibold">${lot.grade || 'Standard'}</span>
        </td>
        <td class="py-space-md px-space-md text-right">
          <div class="text-on-surface-variant line-through text-[12px]">₹ ${lotListingPrice.toLocaleString('en-IN')}</div>
          <div class="font-metric-mono text-label-md font-bold ${parity >= 0 ? 'text-secondary' : 'text-error'}">
            ${parity >= 0 ? '+' : '-'}₹${Math.abs(parity)} (₹${offeredPrice})
          </div>
        </td>
        <td class="py-space-md px-space-md text-right font-metric-mono font-bold text-primary text-title-md">
          ₹ ${totalValue.toLocaleString('en-IN')}
        </td>
        <td class="py-space-md px-space-md">
          <div class="font-medium text-on-surface">Standard</div>
          <div class="text-on-surface-variant text-[12px]">Default Terms</div>
        </td>
        <td class="py-space-md px-space-md font-metric-mono text-on-surface-variant">
          N/A
        </td>
        <td class="py-space-md px-space-md text-center">
          <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center mx-auto text-label-sm border border-emerald-200">
            -
          </div>
        </td>
        <td class="py-space-md px-space-md text-right">
          ${offer.status === 'PENDING' ? `
          <div class="flex items-center justify-end gap-space-2xs">
            <button onclick="handleAcceptOffer('${offer.id}')" class="px-space-sm py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors">Accept</button>
          </div>
          ` : `
          <span class="font-label-sm font-bold text-on-surface-variant">${offer.status}</span>
          `}
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function handleAcceptOffer(offerId) {
  if (!confirm('Are you sure you want to accept this offer? This will create a binding transaction.')) return;
  
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`/api/offers/${offerId}/accept`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

        // Contextual Filter Population
        try {
            const findCommodities = (obj) => {
                let comms = new Set();
                const traverse = (o) => {
                    if (typeof o !== 'object' || o === null) return;
                    if (o.commodity && o.commodity.name) comms.add(o.commodity.name);
                    if (o.commodityName) comms.add(o.commodityName);
                    Object.values(o).forEach(traverse);
                };
                traverse(obj);
                return Array.from(comms).sort();
            };
            const uniqueComms = findCommodities(data);
            document.querySelectorAll('.contextual-produce-filter').forEach(filterSelect => {
                const currentVal = filterSelect.value;
                filterSelect.innerHTML = '<option value="">All Produce</option>' + uniqueComms.map(c => `<option value="${c}">${c}</option>`).join('');
                if (uniqueComms.includes(currentVal)) filterSelect.value = currentVal;
            });
        } catch(e) { console.error('Filter pop error', e); }

    if (!res.ok) throw new Error(data.error || 'Failed to accept offer');
    
    if (typeof showToast === 'function') {
      showToast('Offer accepted successfully! Transaction initiated.', 'success');
    }
    
    await fetchFarmerOffers();
    await fetchFarmerTransactions();
  } catch (err) {
    console.error('Accept Error:', err);
    if (typeof showToast === 'function') {
      showToast(err.message, 'error');
    }
  }
}

async function handleRejectOffer(offerId) {
  if (!confirm('Are you sure you want to reject this offer?')) return;
  
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`/api/offers/${offerId}/reject`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

        // Contextual Filter Population
        try {
            const findCommodities = (obj) => {
                let comms = new Set();
                const traverse = (o) => {
                    if (typeof o !== 'object' || o === null) return;
                    if (o.commodity && o.commodity.name) comms.add(o.commodity.name);
                    if (o.commodityName) comms.add(o.commodityName);
                    Object.values(o).forEach(traverse);
                };
                traverse(obj);
                return Array.from(comms).sort();
            };
            const uniqueComms = findCommodities(data);
            document.querySelectorAll('.contextual-produce-filter').forEach(filterSelect => {
                const currentVal = filterSelect.value;
                filterSelect.innerHTML = '<option value="">All Produce</option>' + uniqueComms.map(c => `<option value="${c}">${c}</option>`).join('');
                if (uniqueComms.includes(currentVal)) filterSelect.value = currentVal;
            });
        } catch(e) { console.error('Filter pop error', e); }

    if (!res.ok) throw new Error(data.error || 'Failed to reject offer');
    
    if (typeof showToast === 'function') {
      showToast('Offer rejected', 'success');
    }
    
    await fetchFarmerOffers();
  } catch (err) {
    console.error('Reject Error:', err);
    if (typeof showToast === 'function') {
      showToast(err.message, 'error');
    }
  }
}

async function fetchFarmerTransactions() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('/api/transactions/farmer', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const data = await res.json();

        // Contextual Filter Population
        try {
            const findCommodities = (obj) => {
                let comms = new Set();
                const traverse = (o) => {
                    if (typeof o !== 'object' || o === null) return;
                    if (o.commodity && o.commodity.name) comms.add(o.commodity.name);
                    if (o.commodityName) comms.add(o.commodityName);
                    Object.values(o).forEach(traverse);
                };
                traverse(obj);
                return Array.from(comms).sort();
            };
            const uniqueComms = findCommodities(data);
            document.querySelectorAll('.contextual-produce-filter').forEach(filterSelect => {
                const currentVal = filterSelect.value;
                filterSelect.innerHTML = '<option value="">All Produce</option>' + uniqueComms.map(c => `<option value="${c}">${c}</option>`).join('');
                if (uniqueComms.includes(currentVal)) filterSelect.value = currentVal;
            });
        } catch(e) { console.error('Filter pop error', e); }

    
    allFarmerTransactions = data.transactions || [];
    renderFarmerTransactions();
    renderActiveTransactions(); // Render the active deals section dynamically
    updateFarmerOfferMetrics(); // Metrics depend on transactions too!
  } catch (err) {
    console.error('Error fetching farmer transactions:', err);
  }
}

function renderActiveTransactions() {
  const container = document.getElementById('activeFarmerTransactions');
  if (!container) return;

  const activeTxns = allFarmerTransactions.filter(txn => txn.status !== 'SETTLED' && txn.status !== 'CANCELLED');

  if (activeTxns.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <div class="space-y-space-md pt-space-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
        <div>
          <div class="flex items-center gap-space-xs">
            <h2 class="font-headline-md text-headline-md text-primary">Active Transactions in Progress</h2>
            <span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">${activeTxns.length} En Route</span>
          </div>
          <p class="font-body-md text-body-md text-on-surface-variant">Track the transaction status, agreed quantity, price, and logistics progress from offer acceptance through settlement.</p>
        </div>
      </div>
  `;

  activeTxns.forEach(txn => {
    const txnIdDisplay = `#TXN-${txn.id.substring(0, 6).toUpperCase()}`;
    const buyerName = txn.offer?.fromUser?.buyerProfile?.companyName || txn.offer?.fromUser?.name || 'Unknown Buyer';
    const commodityName = txn.lot?.commodity?.name || 'Unknown Produce';
    const quantity = txn.offer?.quantity || 0;
    const rate = txn.agreedPrice || 0;
    const total = txn.totalAmount || 0;

    html += `
      <div class="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm space-y-space-lg mb-space-md">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-md border-b border-surface-container">
          <div class="flex items-start gap-space-md">
            <div class="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-primary-fixed flex-shrink-0">
              <span class="material-symbols-outlined text-[26px]">local_shipping</span>
            </div>
            <div>
              <div class="flex items-center gap-space-xs flex-wrap">
                <span class="font-title-lg text-title-lg font-bold text-primary">Transaction ${txnIdDisplay}</span>
                <span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">${txn.status}</span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Buyer: <strong>${buyerName}</strong> • Produce: <strong>${commodityName} (${quantity} Qtl)</strong> • Agreed: <strong>₹${rate.toLocaleString('en-IN')} / Qtl</strong>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-space-md self-start lg:self-auto">
            <div class="flex flex-col text-right">
              <span class="font-label-sm text-label-sm text-on-surface-variant">Trade Value</span>
              <span class="font-metric-mono text-headline-sm font-bold text-primary">₹ ${total.toLocaleString('en-IN')}</span>
            </div>
            <button class="h-11 px-space-md rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors shadow-sm whitespace-nowrap">
              View Transaction Details
            </button>
          </div>
        </div>
        <div class="space-y-space-sm">
          <div class="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant mb-space-xs">
            <span>TRANSACTION PROGRESSION</span>
            <span class="text-secondary font-bold">In Progress</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm">
            <div class="p-space-sm rounded-lg bg-secondary-container/40 flex flex-col gap-space-2xs relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-[12px] font-bold animate-pulse">1</span>
                <span class="font-label-sm text-label-sm text-on-secondary-container font-bold">IN PROGRESS</span>
              </div>
              <span class="font-label-md text-label-md font-bold text-primary mt-1">Transaction Initiated</span>
              <span class="font-body-sm text-body-sm text-on-secondary-container font-medium">Pending Logistics</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderFarmerTransactions() {
  const tbody = document.getElementById('farmerTransactionsBody');
  if (!tbody) return;

  // Clear existing active transactions
  tbody.innerHTML = '';

  if (allFarmerTransactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-space-xl px-space-md text-center text-on-surface-variant">
          No transactions recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  allFarmerTransactions.forEach(txn => {
    const txnIdDisplay = `#TXN-${txn.id.substring(0, 6).toUpperCase()}`;
    const dateDisplay = new Date(txn.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    
    const buyerName = txn.offer?.fromUser?.buyerProfile?.companyName || txn.offer?.fromUser?.name || 'Unknown Buyer';
    const buyerLocation = txn.offer?.fromUser?.buyerProfile?.location || 'Unknown Location';
    
    const commodityName = txn.lot?.commodity?.name || 'Unknown Produce';
    const lotGrade = txn.lot?.grade || 'Standard';
    const quantity = txn.offer?.quantity || 0;
    
    const rate = txn.agreedPrice || 0;
    const total = txn.totalAmount || 0;

    let statusHtml = '';
    if (txn.status === 'INITIATED') statusHtml = `<span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-amber-50 text-amber-800 font-label-sm font-bold border border-amber-200"><span class="material-symbols-outlined text-[12px]">schedule</span> Initiated</span>`;
    else if (txn.status === 'SETTLED') statusHtml = `<span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-emerald-50 text-emerald-800 font-label-sm font-bold border border-emerald-200"><span class="material-symbols-outlined text-[12px]">check_circle</span> Settled</span>`;
    else statusHtml = `<span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-surface-container text-on-surface-variant font-label-sm font-bold"><span class="material-symbols-outlined text-[12px]">info</span> ${txn.status}</span>`;

    html += `
      <tr class="hover:bg-surface-container-low/50 transition-colors">
        <td class="py-space-md px-space-md">
          <div class="font-metric-mono font-bold text-primary">${txnIdDisplay}</div>
          <div class="text-on-surface-variant text-[12px]">${dateDisplay}</div>
        </td>
        <td class="py-space-md px-space-md">
          <div class="font-bold text-on-surface">${buyerName}</div>
          <div class="text-on-surface-variant">${buyerLocation}</div>
        </td>
        <td class="py-space-md px-space-md">
          <div class="font-medium text-on-surface">${commodityName}</div>
          <div class="text-on-surface-variant">${quantity} Quintals • ${lotGrade}</div>
        </td>
        <td class="py-space-md px-space-md text-right font-metric-mono text-on-surface font-semibold">
          ₹ ${rate.toLocaleString('en-IN')} / Qtl
        </td>
        <td class="py-space-md px-space-md text-right font-metric-mono font-bold text-primary text-title-md">
          ₹ ${total.toLocaleString('en-IN')}
        </td>
        <td class="py-space-md px-space-md">
          ${statusHtml}
        </td>
        <td class="py-space-md px-space-md text-right">
          <button class="p-space-xs rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer" title="Download Details">
            <span class="material-symbols-outlined text-[20px]">receipt</span>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}
