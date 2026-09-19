let allOffers = [];

function renderOffers(offers) {
  const tbody = document.getElementById('yourOffersTableBody');
  const recordCount = document.getElementById('offerRecordCount');
  if (!tbody) return;

  // Update Record count text
  if (recordCount) {
    recordCount.textContent = `Showing ${offers.length} of ${allOffers.length} records`;
  }

  if (offers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="py-space-xl px-space-md text-center text-on-surface-variant font-medium">
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="material-symbols-outlined text-4xl opacity-50">inbox</span>
            <span>No records yet</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';

  offers.forEach(offer => {
    const lot = offer.lot || {};
    const commodity = lot.commodity || {};
    const farmer = lot.farmer || {};

    const commodityName = commodity.name || 'Unknown Produce';
    const farmerName = farmer.name || 'Unknown Farmer';
    const lotIdDisplay = lot.id ? `#LOT-${lot.id.substring(0, 6).toUpperCase()}` : 'N/A';
    
    const offerIdDisplay = `#OFF-${offer.id.substring(0, 6).toUpperCase()}`;
    
    const quantity = offer.quantity;
    const offeredPrice = offer.offeredPrice;
    const totalValue = quantity * offeredPrice;

    const sentOn = new Date(offer.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    let statusHtml = '';
    if (offer.status === 'PENDING') {
      statusHtml = `
        <span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-amber-50 text-amber-800 font-label-sm text-label-sm font-semibold border border-amber-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Pending Review
        </span>`;
    } else if (offer.status === 'ACCEPTED') {
      statusHtml = `
        <span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-emerald-50 text-emerald-800 font-label-sm text-label-sm font-semibold border border-emerald-200">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Accepted
        </span>`;
    } else if (offer.status === 'REJECTED') {
      statusHtml = `
        <span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-rose-50 text-rose-800 font-label-sm text-label-sm font-semibold border border-rose-200">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Rejected
        </span>`;
    } else {
      statusHtml = `
        <span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
          ${offer.status}
        </span>`;
    }

    html += `
      <tr class="hover:bg-surface-container-low/50 transition-colors">
        <td class="py-space-sm px-space-md font-metric-mono font-bold text-primary">${offerIdDisplay}</td>
        <td class="py-space-sm px-space-md"><span class="px-space-xs py-space-3xs bg-surface-container rounded font-metric-mono font-semibold text-primary text-label-sm">${lotIdDisplay}</span></td>
        <td class="py-space-sm px-space-md font-semibold text-primary">${farmerName}</td>
        <td class="py-space-sm px-space-md">${commodityName}</td>
        <td class="py-space-sm px-space-md font-bold text-on-surface">${quantity} Q</td>
        <td class="py-space-sm px-space-md font-bold text-primary">₹${offeredPrice.toLocaleString('en-IN')} / Q</td>
        <td class="py-space-sm px-space-md font-semibold text-on-surface">₹${totalValue.toLocaleString('en-IN')}</td>
        <td class="py-space-sm px-space-md text-on-surface-variant">${sentOn}</td>
        <td class="py-space-sm px-space-md">
          ${statusHtml}
        </td>
        <td class="py-space-sm px-space-md text-right">
          <div class="inline-flex items-center gap-space-2xs">
            <button class="px-space-sm py-space-3xs rounded bg-surface-container text-primary font-label-sm text-label-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer view-offer-btn" data-offer-id="${offer.id}">View</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Bind View buttons
  const viewBtns = document.querySelectorAll('.view-offer-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const offerId = btn.getAttribute('data-offer-id');
      openOfferDetailsModal(offerId);
    });
  });
}

function openOfferDetailsModal(offerId) {
  const offer = allOffers.find(o => o.id === offerId);
  if (!offer) {
    if (typeof showToast === 'function') {
      showToast('Offer details could not be loaded.', 'error');
    }
    return;
  }

  const modal = document.getElementById('offerDetailModal');
  if (!modal) return;

  const lot = offer.lot || {};
  const commodity = lot.commodity || {};
  const farmer = lot.farmer || {};

  const commodityName = commodity.name || 'Unknown Produce';
  const farmerName = farmer.name || 'Unknown Farmer';
  const lotIdDisplay = lot.id ? `#LOT-${lot.id.substring(0, 6).toUpperCase()}` : 'N/A';
  const offerIdDisplay = `#OFF-${offer.id.substring(0, 6).toUpperCase()}`;

  const quantity = offer.quantity;
  const offeredPrice = offer.offeredPrice;
  const totalValue = quantity * offeredPrice;

  const sentOn = new Date(offer.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const quality = lot.grade || 'Standard';
  const location = lot.location || 'Local Mandi';
  const remarks = offer.message || 'No additional remarks.';

  document.getElementById('modalOfferIdDisplay').textContent = offerIdDisplay;
  document.getElementById('modalOfferTitle').textContent = `${commodityName} • ${quantity} Q`;
  
  const statusEl = document.getElementById('modalOfferStatusDisplay');
  if (offer.status === 'PENDING') {
    statusEl.className = 'px-space-xs py-space-3xs rounded-full bg-amber-50 text-amber-800 font-label-sm text-label-sm font-semibold border border-amber-200';
    statusEl.textContent = 'Pending Review';
  } else if (offer.status === 'ACCEPTED') {
    statusEl.className = 'px-space-xs py-space-3xs rounded-full bg-emerald-50 text-emerald-800 font-label-sm text-label-sm font-semibold border border-emerald-200';
    statusEl.textContent = 'Accepted';
  } else if (offer.status === 'REJECTED') {
    statusEl.className = 'px-space-xs py-space-3xs rounded-full bg-rose-50 text-rose-800 font-label-sm text-label-sm font-semibold border border-rose-200';
    statusEl.textContent = 'Rejected';
  } else {
    statusEl.className = 'px-space-xs py-space-3xs rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold';
    statusEl.textContent = offer.status;
  }

  document.getElementById('modalSentOn').textContent = sentOn;
  document.getElementById('modalQuantity').textContent = `${quantity} Quintals`;
  document.getElementById('modalOfferedPrice').textContent = `₹${offeredPrice.toLocaleString('en-IN')} / Q`;
  document.getElementById('modalTotalValue').textContent = `₹${totalValue.toLocaleString('en-IN')}`;
  document.getElementById('modalRemarks').textContent = remarks;

  document.getElementById('modalLotId').textContent = lotIdDisplay;
  document.getElementById('modalFarmerName').textContent = farmerName;
  document.getElementById('modalQuality').textContent = quality;
  document.getElementById('modalLocation').textContent = location;

  modal.classList.remove('hidden');
}

// Modal closing logic
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('offerDetailModal');
  const closeBtn = document.getElementById('closeOfferDetailBtn');
  const dismissBtn = document.getElementById('dismissOfferDetailBtn');

  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Dynamic counter price computation in the negotiation card
  const counterPriceInput = document.getElementById('counterPriceInput');
  const counterComputed = document.getElementById('counterComputed');
  if (counterPriceInput && counterComputed) {
    counterPriceInput.addEventListener('input', () => {
      const val = parseFloat(counterPriceInput.value) || 0;
      const total = val * 120;
      counterComputed.textContent = 'Val: ₹' + total.toLocaleString('en-IN');
    });
  }
});

function updateFilterButtons(counts) {
  const tabsContainer = document.getElementById('offerStatusTabsContainer');
  if (!tabsContainer) return;
  const buttons = tabsContainer.querySelectorAll('button');
  
  buttons.forEach(btn => {
    const text = btn.textContent.toLowerCase();
    if (text.includes('all')) {
      btn.textContent = `All (${counts.all})`;
    } else if (text.includes('pending')) {
      btn.textContent = `Pending (${counts.pending})`;
    } else if (text.includes('negotiation')) {
      // Preserve the blue dot for Negotiation tab if it exists, or just set text
      const hasDot = btn.innerHTML.includes('bg-blue-600');
      if (hasDot) {
        btn.innerHTML = `<span>Negotiation (${counts.negotiation})</span><span class="w-2 h-2 rounded-full bg-blue-600"></span>`;
      } else {
        btn.textContent = `Negotiation (${counts.negotiation})`;
      }
    } else if (text.includes('accepted')) {
      btn.textContent = `Accepted (${counts.accepted})`;
    } else if (text.includes('rejected')) {
      btn.textContent = `Rejected (${counts.rejected})`;
    } else if (text.includes('completed')) {
      btn.textContent = `Completed (${counts.completed})`;
    }

    // Bind click listener for filtering
    btn.addEventListener('click', () => {
      // Manage active styling (Stitch style: selected is bg-primary-container text-on-primary, inactive is text-on-surface-variant hover:...)
      buttons.forEach(b => {
        b.className = "px-space-md py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-label-md text-label-md font-medium shrink-0";
      });
      btn.className = "px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold shrink-0";
      
      const filter = text.split(' ')[0].toLowerCase();
      if (filter === 'all') {
        renderOffers(allOffers);
      } else if (filter === 'negotiation') {
        const filtered = allOffers.filter(o => o.status === 'COUNTERED');
        renderOffers(filtered);
      } else {
        const filtered = allOffers.filter(o => o.status.toLowerCase() === filter);
        renderOffers(filtered);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    if (typeof showToast === 'function') {
      showToast('Please log in to view your offers', 'error');
    }
    return;
  }

  try {
    const res = await fetch('/api/offers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

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

    allOffers = data.offers || [];

    const counts = {
      all: allOffers.length,
      pending: allOffers.filter(o => o.status === 'PENDING').length,
      negotiation: allOffers.filter(o => o.status === 'COUNTERED').length,
      accepted: allOffers.filter(o => o.status === 'ACCEPTED').length,
      rejected: allOffers.filter(o => o.status === 'REJECTED').length,
      completed: allOffers.filter(o => o.status === 'COMPLETED').length
    };

    updateFilterButtons(counts);
    renderOffers(allOffers);
    
    // Also fetch transactions for buyer
    await fetchBuyerTransactions();

  } catch (error) {
    console.error(error);
    if (typeof showToast === 'function') {
      showToast('Failed to connect to backend for offers.', 'error');
    }
  }
});

let allBuyerTransactions = [];

async function fetchBuyerTransactions() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('/api/transactions/buyer', {
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

    
    allBuyerTransactions = data.transactions || [];
    renderBuyerTransactions();
    updateBuyerOfferMetrics();
  } catch (err) {
    console.error('Error fetching buyer transactions:', err);
  }
}

function renderBuyerTransactions() {
  const activeContainer = document.getElementById('activeTransactionsContainer');
  const completedTbody = document.getElementById('completedTransactionsTableBody');
  const activeCountEl = document.getElementById('activeTxnCount');
  const completedCountEl = document.getElementById('completedTxnCount');

  const activeTxns = allBuyerTransactions.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  const completedTxns = allBuyerTransactions.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED');

  if (activeCountEl) activeCountEl.textContent = `(${activeTxns.length})`;
  if (completedCountEl) completedCountEl.textContent = `(${completedTxns.length})`;

  if (activeContainer) {
    if (activeTxns.length === 0) {
      activeContainer.innerHTML = `
        <div class="p-space-xl text-center flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-xl bg-surface">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-space-xs">hourglass_empty</span>
          <p class="font-title-md text-title-md font-bold text-on-surface">No Active Transactions</p>
          <p class="font-body-md text-body-md text-on-surface-variant">Your accepted deals will appear here while in fulfillment.</p>
        </div>
      `;
    } else {
      let activeHtml = '';
      activeTxns.forEach(txn => {
        const txnIdDisplay = `#TXN-${txn.id.substring(0, 6).toUpperCase()}`;
        const commodityName = txn.lot?.commodity?.name || 'Unknown Produce';
        const quantity = txn.offer?.quantity || 0;
        const farmerName = txn.lot?.farmer?.name || 'Unknown Farmer';
        const agreedPrice = txn.agreedPrice || 0;
        const totalAmount = txn.totalAmount || 0;
        const dateDisplay = new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        activeHtml += `
          <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border-2 border-secondary/40 flex flex-col gap-space-md">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
              <div class="flex flex-wrap items-center gap-space-xs">
                <span class="font-metric-mono text-metric-mono font-bold text-primary bg-surface-container-low px-space-xs py-space-3xs rounded">${txnIdDisplay}</span>
                <span class="font-title-lg text-title-lg font-bold text-primary">${commodityName} • ${quantity} Quintals</span>
                <span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">local_shipping</span> ${txn.status}
                </span>
                <span class="text-label-sm text-secondary font-medium">Created: ${dateDisplay}</span>
              </div>
              <div class="flex items-center gap-space-xs">
                <button class="px-space-sm py-1.5 rounded-lg border border-outline text-primary font-label-md font-semibold hover:bg-surface-container transition-colors">Track Logistics</button>
                <button class="px-space-sm py-1.5 rounded-lg bg-primary text-on-primary font-label-md font-semibold hover:bg-secondary transition-colors">View Details</button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm p-space-sm bg-surface-container-low rounded-lg">
              <div class="flex flex-col">
                <span class="font-label-sm text-label-sm text-on-surface-variant">Seller Entity</span>
                <span class="font-title-md font-bold text-on-surface">${farmerName}</span>
              </div>
              <div class="flex flex-col">
                <span class="font-label-sm text-label-sm text-on-surface-variant">Agreed Rate</span>
                <span class="font-metric-mono font-bold text-on-surface">₹${agreedPrice.toLocaleString('en-IN')} / Qtl</span>
              </div>
              <div class="flex flex-col">
                <span class="font-label-sm text-label-sm text-on-surface-variant">Total Volume</span>
                <span class="font-metric-mono font-bold text-on-surface">${quantity} Quintals</span>
              </div>
              <div class="flex flex-col md:text-right">
                <span class="font-label-sm text-label-sm text-secondary font-semibold">Total Invoice Value</span>
                <span class="font-metric-mono text-title-md font-bold text-secondary">₹${totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        `;
      });
      activeContainer.innerHTML = activeHtml;
    }
  }

  if (completedTbody) {
    if (completedTxns.length === 0) {
      completedTbody.innerHTML = `<tr><td colspan="8" class="py-space-xl text-center text-on-surface-variant font-medium">No completed transactions found.</td></tr>`;
      return;
    }
    
    let completedHtml = '';
    completedTxns.forEach(txn => {
      const txnIdDisplay = `#TXN-${txn.id.substring(0, 6).toUpperCase()}`;
      const commodityName = txn.lot?.commodity?.name || 'Unknown Produce';
      const quantity = txn.offer?.quantity || 0;
      const farmerName = txn.lot?.farmer?.name || 'Unknown Farmer';
      const totalAmount = txn.totalAmount || 0;
      const dateDisplay = new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      completedHtml += `
        <tr class="hover:bg-surface-container-low/50 transition-colors">
          <td class="py-space-sm px-space-md font-metric-mono font-bold text-primary">${txnIdDisplay}</td>
          <td class="py-space-sm px-space-md font-semibold text-primary">${commodityName}</td>
          <td class="py-space-sm px-space-md text-on-surface-variant">${farmerName}</td>
          <td class="py-space-sm px-space-md font-bold text-on-surface">${quantity} Quintals</td>
          <td class="py-space-sm px-space-md font-semibold text-primary">₹${totalAmount.toLocaleString('en-IN')}</td>
          <td class="py-space-sm px-space-md text-on-surface-variant">${dateDisplay}</td>
          <td class="py-space-sm px-space-md">
            <span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
              <span class="material-symbols-outlined text-[13px]">check_circle</span> Settled
            </span>
          </td>
          <td class="py-space-sm px-space-md text-right">
            <button class="inline-flex items-center gap-1 px-space-sm py-space-3xs rounded bg-surface-container text-primary font-label-sm text-label-sm font-medium hover:bg-surface-container-high transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-[14px]">download</span> PDF
            </button>
          </td>
        </tr>
      `;
    });
    completedTbody.innerHTML = completedHtml;
  }
}

function updateBuyerOfferMetrics() {
  const pending = allOffers.filter(o => o.status === 'PENDING').length;
  const countered = allOffers.filter(o => o.status === 'COUNTERED').length;
  const accepted = allOffers.filter(o => o.status === 'ACCEPTED').length;
  const rejected = allOffers.filter(o => o.status === 'REJECTED').length;
  const expired = allOffers.filter(o => o.status === 'EXPIRED').length;
  const activeTxns = allBuyerTransactions.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
  
  const contractValue = allBuyerTransactions.reduce((sum, txn) => sum + (txn.totalAmount || 0), 0);
  let formattedValue = '₹ 0';
  if (contractValue >= 100000) {
    formattedValue = '₹' + (contractValue / 100000).toFixed(2) + 'L';
  } else if (contractValue > 0) {
    formattedValue = '₹' + contractValue.toLocaleString('en-IN');
  }

  const kpiPending = document.getElementById('kpi-pending-offers');
  if (kpiPending) kpiPending.textContent = pending;

  const kpiPendingSubtext = document.getElementById('kpi-pending-subtext');
  if (kpiPendingSubtext) {
    kpiPendingSubtext.textContent = `${pending} awaiting seller response`;
  }

  const kpiNegotiations = document.getElementById('kpi-negotiations');
  if (kpiNegotiations) kpiNegotiations.textContent = countered;

  const kpiNegotiationsSubtext = document.getElementById('kpi-negotiations-subtext');
  if (kpiNegotiationsSubtext) {
    if (countered === 0) {
      kpiNegotiationsSubtext.textContent = 'No active negotiations';
    } else {
      kpiNegotiationsSubtext.textContent = `${countered} require your response`;
    }
  }

  const kpiAccepted = document.getElementById('kpi-accepted-deals');
  if (kpiAccepted) kpiAccepted.textContent = accepted;

  const kpiActive = document.getElementById('kpi-active-transactions');
  if (kpiActive) kpiActive.textContent = activeTxns;

  const kpiActiveSubtext = document.getElementById('kpi-active-subtext');
  if (kpiActiveSubtext) {
    kpiActiveSubtext.textContent = `${activeTxns} currently active`;
  }

  const kpiContract = document.getElementById('kpi-contract-value');
  if (kpiContract) kpiContract.textContent = formattedValue;

  const tabAll = document.getElementById('tab-all');
  if (tabAll) tabAll.textContent = `(${allOffers.length})`;
  
  const tabPending = document.getElementById('tab-pending');
  if (tabPending) tabPending.textContent = `(${pending})`;
  
  const tabNegotiation = document.getElementById('tab-negotiation');
  if (tabNegotiation) tabNegotiation.textContent = `(${countered})`;

  const tabAccepted = document.getElementById('tab-accepted');
  if (tabAccepted) tabAccepted.textContent = `(${accepted})`;

  const tabRejected = document.getElementById('tab-rejected');
  if (tabRejected) tabRejected.textContent = `(${rejected})`;

  const tabExpired = document.getElementById('tab-expired');
  if (tabExpired) tabExpired.textContent = `(${expired})`;
}
