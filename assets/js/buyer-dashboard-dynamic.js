document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  const fetchApi = async (url) => {
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(`Fetch error for ${url}:`, e);
    }
    return null;
  };

  const emptyRow = (colSpan, text) => `<tr><td colspan="${colSpan}" class="text-center py-8 text-on-surface-variant">${text}</td></tr>`;

  // 1. Fetch Requirements (and populate KPIs)
  const reqData = await fetchApi('/api/requirements');
  if (reqData && reqData.requirements) {
    const activeReqs = reqData.requirements.filter(r => r.status === 'OPEN').length;
    const kpiElement = document.getElementById('kpi-reqs');
    if (kpiElement) kpiElement.textContent = activeReqs || reqData.requirements.length;

    // Populate active requirements
    const reqContainer = document.getElementById('dashboard-active-requirements');
    if (reqContainer) {
      if (reqData.requirements.length === 0) {
        reqContainer.innerHTML = '<div class="p-space-lg text-center text-on-surface-variant bg-surface-container-lowest rounded-xl">No active requirements found.</div>';
      } else {
        reqContainer.innerHTML = reqData.requirements.slice(0, 3).map(req => `
          <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
            <div class="flex-1 flex flex-col gap-space-xs">
              <div class="flex flex-wrap items-center gap-space-xs">
                <span class="font-label-sm text-label-sm uppercase tracking-wider px-space-xs py-space-3xs bg-surface-container-low text-on-surface-variant rounded">REQ-${req.id.substring(0,8)}</span>
                <span class="font-title-lg text-title-lg text-primary font-semibold">${req.commodity.name}</span>

                <span class="px-space-xs py-space-3xs rounded-full bg-secondary-fixed-dim/30 text-on-secondary-fixed font-label-sm text-label-sm">${req.status}</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-space-sm text-on-surface-variant font-body-sm text-body-sm mt-space-2xs">
                <div><span class="text-outline">Quantity:</span> <span class="text-on-surface font-medium">${req.quantityNeeded} ${req.commodity.unit}</span></div>
                <div><span class="text-outline">Target Price:</span> <span class="text-on-surface font-medium">₹${req.maxPrice || 'Open'}/${req.commodity.unit.charAt(0)}</span></div>
                <div><span class="text-outline">Delivery:</span> <span class="text-on-surface font-medium truncate">${req.deliveryLocation || 'Not specified'}</span></div>
                <div><span class="text-outline">Required By:</span> <span class="text-on-surface font-medium">${req.requiredBy || 'Not specified'}</span></div>
              </div>
              <div class="w-full mt-space-2xs">
                <div class="flex items-center justify-between font-label-sm text-label-sm mb-space-3xs">
                  <span class="text-on-surface-variant">Fulfillment Progress</span>
                  <span class="font-semibold text-secondary">Fulfillment: Not calculated</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-space-xs shrink-0 pt-space-xs lg:pt-0">
              <a class="px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container transition-colors" href="procurement-requirements.html">View Requirement</a>
              <a class="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors shadow-sm" href="matching-lots.html">View Matching Lots</a>
            </div>
          </div>
        `).join('');
      }
    }
  }

  // 2. Fetch Matching Lots KPI & Render
  const matchData = await fetchApi('/api/matching');
  if (matchData && matchData.lots) {
    const kpiMatching = document.getElementById('kpi-matching');
    if (kpiMatching) kpiMatching.textContent = matchData.lots.length;

    const matchesContainer = document.getElementById('dashboard-matching-lots');
    if (matchesContainer) {
      if (matchData.lots.length === 0) {
        matchesContainer.innerHTML = '<div class="col-span-full p-space-lg text-center text-on-surface-variant bg-surface-container-lowest rounded-xl">No matching lots found.</div>';
      } else {
        matchesContainer.innerHTML = matchData.lots.slice(0, 3).map(lot => `
          <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col justify-between hover:shadow-md transition-shadow">
            <div class="flex flex-col gap-space-sm">
              <div class="flex items-start justify-between gap-space-xs">
                <span class="inline-flex items-center gap-space-3xs px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">Available Lot</span>
                <span class="px-space-xs py-space-3xs rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold">Match</span>
              </div>
              <div class="h-32 w-full rounded-lg overflow-hidden relative mt-space-2xs bg-surface-container flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant/30">eco</span>
                <span class="absolute bottom-2 left-2 bg-inverse-surface/85 backdrop-blur-sm text-inverse-on-surface px-space-xs py-space-3xs rounded font-label-sm text-label-sm">Lot #${lot.id.substring(0,6)}</span>
              </div>
              <div class="flex flex-col gap-space-2xs">
                <h3 class="font-title-lg text-title-lg text-primary font-semibold">${lot.commodity.name}</h3>
                <div class="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-space-3xs">
                  <span class="material-symbols-outlined text-[16px] text-secondary">agriculture</span> <span class="">${lot.farmer?.name || 'Unknown Farmer'}</span>
                </div>
              </div>
              <div class="bg-surface-container-low p-space-sm rounded-lg grid grid-cols-2 gap-space-xs font-body-sm text-body-sm">
                <div><span class="text-outline">Quantity:</span> <span class="font-semibold text-on-surface">${lot.quantity} ${lot.unit}</span></div>
                <div><span class="text-outline">Quality:</span> <span class="font-semibold text-on-surface">${lot.grade || 'Standard'}</span></div>
              </div>
              <div class="flex items-baseline justify-between pt-space-2xs">
                <span class="text-on-surface-variant font-label-md text-label-md">Asking Price</span>
                <span class="font-title-lg text-title-lg text-primary font-bold">₹${lot.listingPrice} <span class="font-label-sm text-label-sm font-normal text-on-surface-variant">/ ${lot.unit.charAt(0)}</span></span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-space-xs pt-space-md">
              <a class="text-center py-space-xs px-space-sm rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container transition-colors" href="matching-lots.html">View Lot</a>
              <a class="text-center py-space-xs px-space-sm rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors shadow-sm" href="offers-transactions.html">Make Offer</a>
            </div>
          </div>
        `).join('');
      }
    }
  }

  // 3. Fetch Offers KPI & Render
  const offersData = await fetchApi('/api/offers');
  if (offersData && offersData.offers) {
    const pendingOffers = offersData.offers.filter(o => o.status === 'PENDING').length;
    const kpiOffers = document.getElementById('kpi-offers');
    if (kpiOffers) kpiOffers.textContent = pendingOffers || offersData.offers.length;

    const offersTbody = document.getElementById('dashboard-recent-offers');
    if (offersTbody) {
      if (offersData.offers.length === 0) {
        offersTbody.innerHTML = emptyRow(9, 'No recent offers found.');
      } else {
        offersTbody.innerHTML = offersData.offers.slice(0, 3).map(offer => {
          const commodityName = offer.lot?.commodity?.name || 'Unknown Produce';
          const farmerName = offer.lot?.farmer?.name || 'Unknown Farmer';
          const lotId = offer.lot?.id ? offer.lot.id.substring(0, 6).toUpperCase() : 'N/A';
          return `
            <tr class="hover:bg-surface-container-low transition-colors">
              <td class="py-space-sm px-space-md font-metric-mono text-primary font-medium">#OFF-${offer.id.substring(0,6).toUpperCase()}</td>
              <td class="py-space-sm px-space-md text-on-surface-variant">#LOT-${lotId}</td>
              <td class="py-space-sm px-space-md font-medium text-on-surface">${farmerName}</td>
              <td class="py-space-sm px-space-md font-medium text-on-surface">${commodityName}</td>
              <td class="py-space-sm px-space-md">${offer.quantity} Qtl</td>
              <td class="py-space-sm px-space-md text-right font-metric-mono">₹${offer.offeredPrice}/Q</td>
              <td class="py-space-sm px-space-md text-right font-metric-mono font-semibold text-primary">₹${offer.quantity * offer.offeredPrice}</td>
              <td class="py-space-sm px-space-md text-center">
                <span class="inline-flex items-center px-space-2xs py-space-3xs rounded-full bg-surface-container text-on-surface-variant font-label-sm font-medium">
                  ${offer.status}
                </span>
              </td>
              <td class="py-space-sm px-space-md text-right">
                <a class="text-secondary hover:underline font-label-sm font-semibold" href="offers-transactions.html">Details</a>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // 4. Fetch Transactions KPI
  const txData = await fetchApi('/api/transactions/buyer');
  if (txData && txData.transactions) {
    const activeTxns = txData.transactions.filter(t => t.status !== 'CANCELLED');
    const kpiTransactions = document.getElementById('kpi-transactions');
    if (kpiTransactions) kpiTransactions.textContent = activeTxns.length;
    
    const totalValue = activeTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    let valueText = '₹0';
    if (totalValue >= 100000) {
      valueText = `₹${(totalValue / 100000).toFixed(1)}L`;
    } else {
      valueText = `₹${totalValue.toLocaleString('en-IN')}`;
    }
    const kpiValue = document.getElementById('kpi-transactions-value');
    if (kpiValue) kpiValue.textContent = `${valueText} total value`;

    const txContainer = document.getElementById('dashboardActiveTransactionsContainer');
    if (txContainer) {
      if (activeTxns.length > 0) {
        txContainer.innerHTML = activeTxns.slice(0, 3).map(txn => {
          const txnIdDisplay = `#TXN-${txn.id.substring(0, 6).toUpperCase()}`;
          const commodityName = txn.lot?.commodity?.name || 'Unknown Produce';
          const quantity = txn.offer?.quantity || 0;
          const farmerName = txn.lot?.farmer?.name || 'Unknown Farmer';
          const totalAmount = txn.totalAmount || 0;
          const agreedPrice = txn.agreedPrice || 0;
          
          return `
          <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-lg">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm pb-space-sm bg-surface-container-low/40 p-space-md rounded-lg">
              <div class="flex flex-col sm:flex-row sm:items-center gap-space-sm">
                <span class="font-metric-mono text-metric-mono font-bold text-primary">${txnIdDisplay}</span>
                <span class="hidden sm:inline text-outline">•</span>
                <span class="font-title-md text-title-md text-primary font-semibold">${commodityName} • ${quantity} Quintals</span>
                <span class="hidden sm:inline text-outline">•</span>
                <span class="text-on-surface-variant font-body-sm text-body-sm">Seller: ${farmerName}</span>
              </div>
              <div class="flex items-center gap-space-md">
                <span class="font-body-sm text-body-sm text-on-surface-variant">₹${agreedPrice}/Q</span>
                <span class="font-title-lg text-title-lg font-bold text-primary">₹${totalAmount.toLocaleString('en-IN')}</span>
                <a class="inline-flex items-center gap-space-3xs font-label-md text-label-md text-secondary hover:underline font-semibold" data-path="buyer-offers" href="offers-transactions.html">
                  <span class="">View Transaction</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-md p-space-md rounded-lg bg-surface-container-low font-body-sm text-body-sm">
              <div class="flex flex-col gap-space-3xs">
                <span class="text-outline">Status</span>
                <span class="text-on-surface font-medium">${txn.status}</span>
              </div>
              <div class="flex flex-col gap-space-3xs">
                <span class="text-outline">Platform Recorded</span>
                <span class="text-on-surface font-medium">₹${totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          `;
        }).join('');
      }
    }
  }
  // 5. Fetch Payments and populate Payment KPIs
  const paymentsData = await fetchApi('/api/payments/my');
  if (paymentsData && paymentsData.payments) {
    const formatAmount = (val) => {
      if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
      return '₹' + val.toLocaleString('en-IN');
    };

  }
});
