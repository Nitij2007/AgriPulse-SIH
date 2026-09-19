document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  const fetchApi = async (url) => {
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Fetch error:', e);
    }
    return null;
  };

  const emptyRow = (colSpan, text) => `<tr><td colspan="${colSpan}" class="text-center py-8 text-on-surface-variant">${text}</td></tr>`;
  const emptyBlock = (text) => `<div class="text-center py-8 text-on-surface-variant bg-surface-container-low rounded-xl">${text}</div>`;

  // 1. Fetch Lots
  const lotsData = await fetchApi('/api/lots');
  const lotsTableBody = document.getElementById('dashboard-active-lots');
  if (lotsTableBody && lotsData && lotsData.lots) {
    if (lotsData.lots.length === 0) {
      lotsTableBody.innerHTML = emptyRow(6, 'No active lots found. Create a lot to get started.');
    } else {
      lotsTableBody.innerHTML = lotsData.lots.slice(0, 3).map(lot => `
        <tr class="hover:bg-emerald-50/50 transition-colors">
          <td class="py-space-sm px-space-sm">
            <div class="flex flex-col">
              <span class="font-label-md text-label-md font-semibold text-primary">${lot.commodity.name}</span>
              <span class="font-metric-mono text-label-sm text-on-surface-variant">#${lot.id.split('-')[0]}</span>
            </div>
          </td>
          <td class="py-space-sm px-space-sm">
            <span class="font-metric-mono font-medium text-on-surface">${lot.quantity} ${lot.unit}</span>
          </td>
          <td class="py-space-sm px-space-sm">
            <div class="flex flex-col">
              <span class="font-label-sm text-label-sm text-secondary font-medium">${lot.grade || 'Standard'}</span>
              <span class="font-body-sm text-on-surface-variant">Moisture ${lot.moisturePct || 12}%</span>
            </div>
          </td>
          <td class="py-space-sm px-space-sm text-right">
            <span class="font-metric-mono font-semibold text-primary">₹${lot.listingPrice}</span>
            <span class="font-body-sm text-on-surface-variant">/${lot.unit.charAt(0)}</span>
          </td>
          <td class="py-space-sm px-space-sm text-center">
            <span class="inline-flex items-center px-space-2xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium">
              ${lot.status}
            </span>
          </td>
          <td class="py-space-sm px-space-sm text-right">
            <button class="px-space-xs py-space-3xs rounded-lg bg-surface-container-low hover:bg-emerald-100/70 text-secondary font-label-sm text-label-sm transition-colors border border-emerald-950/5" onclick="window.location.href='offers-transactions.html'" type="button">
              View Bids
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  // 2. Fetch Buyer Opportunities (Requirements)
  const reqData = await fetchApi('/api/matching/buyers');
  const reqContainer = document.getElementById('dashboard-buyer-opportunities');
  if (reqContainer && reqData) {
    const requirements = reqData.requirements || [];
    if (requirements.length === 0) {
      reqContainer.innerHTML = emptyBlock('No buyer opportunities currently match your active lots.');
    } else {
      reqContainer.innerHTML = requirements.slice(0, 2).map(req => `
        <div class="p-space-md rounded-xl bg-surface-container-low/70 hover:bg-emerald-50/70 border border-emerald-950/5 hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col space-y-space-xs">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-space-xs">
              <span class="font-title-md text-title-md font-semibold text-primary">${req.buyerName}</span>
              <span class="inline-flex items-center gap-space-3xs px-space-2xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
                <span class="material-symbols-outlined text-[14px]">verified</span>
                <span class="">Verified</span>
              </span>
            </div>
            <span class="font-metric-mono text-label-md font-semibold text-secondary">${req.maxPrice ? 'Max ₹' + req.maxPrice : 'Open Price'}</span>
          </div>
          <div class="font-body-sm text-body-sm text-on-surface">
            <span class="font-medium text-primary">${req.commodity}</span> • ${req.quantityNeeded} Qtl ${req.qualitySpecs ? ' (' + req.qualitySpecs + ')' : ''}
          </div>
          <div class="pt-space-xs flex justify-end">
            <button class="inline-flex items-center gap-space-3xs px-space-md py-space-xs rounded-lg bg-[#0f382c] text-on-primary font-label-sm text-label-sm hover:bg-[#164a3b] transition-all duration-200 shadow-sm" onclick="window.location.href='matched-buyers.html'">
              <span class="">View Matches</span>
              <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  // 3. Fetch Recent Offers & Transactions
  const offersData = await fetchApi('/api/offers');
  const offersContainer = document.getElementById('dashboard-recent-offers');
  if (offersContainer && offersData) {
    const offers = (offersData.offers || []).filter(o => o.lot);
    if (offers.length === 0) {
      offersContainer.innerHTML = emptyRow(6, 'No recent offers or transactions yet.');
    } else {
      offersContainer.innerHTML = offers.slice(0, 3).map(offer => {
        const offerIdDisplay = `#OFF-${offer.id.substring(0, 6).toUpperCase()}`;
        const commodityName = offer.lot?.commodity?.name || 'Unknown Produce';
        const quantity = offer.quantity;
        const buyerName = offer.fromUser?.buyerProfile?.companyName || offer.fromUser?.name || 'Unknown Buyer';
        const offeredPrice = offer.offeredPrice;
        const totalValue = quantity * offeredPrice;
        
        let statusHtml = '';
        if (offer.status === 'PENDING') statusHtml = `<span class="inline-flex items-center gap-space-3xs px-space-2xs py-space-3xs rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-medium"><span class="w-1.5 h-1.5 rounded-full bg-on-tertiary-container"></span><span class="">Pending</span></span>`;
        else if (offer.status === 'ACCEPTED') statusHtml = `<span class="inline-flex items-center gap-space-3xs px-space-2xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium"><span class="w-1.5 h-1.5 rounded-full bg-secondary"></span><span class="">Accepted</span></span>`;
        else statusHtml = `<span class="inline-flex items-center px-space-2xs py-space-3xs rounded-full bg-surface-container text-on-surface-variant font-label-sm font-medium">${offer.status}</span>`;

        let actionHtml = '';
        if (offer.status === 'PENDING') {
          actionHtml = `<button class="px-space-xs py-space-3xs rounded bg-[#0f382c] text-on-primary font-label-sm text-label-sm hover:bg-[#164a3b] transition-colors shadow-xs" onclick="window.location.href='offers-transactions.html'">Review</button>`;
        } else if (offer.status === 'ACCEPTED') {
          actionHtml = `<button class="px-space-sm py-space-xs rounded-lg bg-surface-container-low hover:bg-emerald-100/70 text-primary font-label-sm text-label-sm font-medium transition-colors border border-emerald-950/5" onclick="window.location.href='logistics-storage.html'">Manifest &amp; Gatepass</button>`;
        }

        return `
        <tr class="hover:bg-emerald-50/50 transition-colors">
          <td class="py-space-sm px-space-sm">
            <div class="flex flex-col">
              <span class="font-label-md text-label-md font-semibold text-primary">${offerIdDisplay} ${commodityName}</span>
              <span class="font-body-sm text-on-surface-variant">${quantity} Quintal Batch</span>
            </div>
          </td>
          <td class="py-space-sm px-space-sm">
            <div class="flex items-center gap-space-2xs">
              <span class="material-symbols-outlined text-[18px] text-secondary">business</span>
              <span class="font-medium text-on-surface">${buyerName}</span>
            </div>
          </td>
          <td class="py-space-sm px-space-sm text-right">
            <div class="flex flex-col">
              <span class="font-metric-mono font-semibold text-primary">₹${totalValue.toLocaleString('en-IN')}</span>
              <span class="font-body-sm text-on-surface-variant">₹${offeredPrice} / Qtl</span>
            </div>
          </td>
          <td class="py-space-sm px-space-sm text-on-surface-variant">
            ${new Date(offer.createdAt).toLocaleDateString()}
          </td>
          <td class="py-space-sm px-space-sm text-center">
            ${statusHtml}
          </td>
          <td class="py-space-sm px-space-sm text-right">
            ${actionHtml}
          </td>
        </tr>
        `;
      }).join('');
    }
  }

  // Populate buyer demand from matching data
  if (reqData) {
    const requirements = reqData.requirements || [];
    const el4 = document.getElementById('kpi-buyer-demand');
    if (el4) el4.textContent = requirements.length > 3 ? 'High Demand' : requirements.length > 0 ? 'Active' : 'No active demand';
    const el5 = document.getElementById('kpi-demand-count');
    if (el5) el5.textContent = requirements.length + ' buyer inquiries open';
  } else {
    const el4 = document.getElementById('kpi-buyer-demand');
    if (el4) el4.textContent = 'No active demand';
  }

  // 5. Fetch Payments and populate KPIs
  const paymentsData = await fetchApi('/api/payments');
  if (paymentsData && paymentsData.payments) {
    const pending = paymentsData.payments.filter(p => p.status === 'PENDING');
    const completed = paymentsData.payments.filter(p => p.status === 'COMPLETED');
    const pendingTotal = pending.reduce((sum, p) => sum + (p.amount || 0), 0);
    const clearedTotal = completed.reduce((sum, p) => sum + (p.amount || 0), 0);
    const el6 = document.getElementById('kpi-pending-settlement');
    if (el6) el6.textContent = '₹' + pendingTotal.toLocaleString('en-IN') + ' Pending Settlement';
    const el7 = document.getElementById('kpi-cleared-amount');
    if (el7) el7.textContent = '₹' + clearedTotal.toLocaleString('en-IN');
  }

  // 6. Fetch Logistics and populate KPI
  try {
    const logisticsData = await fetchApi('/api/logistics');
    const elLogisticsContainer = document.getElementById('kpi-logistics-container');
    const elLogisticsStatus = document.getElementById('kpi-logistics-status');
    const elLogisticsRef = document.getElementById('kpi-logistics-ref');
    
    if (logisticsData && logisticsData.logistics && logisticsData.logistics.length > 0) {
      const logItem = logisticsData.logistics[0];
      const tx = logItem.transaction;
      
      let refId = '';
      if (logItem.id) {
        refId = `LOG-${logItem.id.substring(0, 6).toUpperCase()}`;
      } else if (tx && tx.id) {
        refId = `LOG-${tx.id.substring(0, 6).toUpperCase()}`;
      }
      
      let statusText = logItem.status || 'PENDING';
      statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1).toLowerCase();
      
      const commodity = tx?.lot?.commodity?.name || 'Crop';
      const quantity = tx?.offer?.quantity || tx?.lot?.quantity || 0;
      const buyerName = tx?.offer?.fromUser?.buyerProfile?.companyName || tx?.offer?.fromUser?.name || 'Buyer';
      
      if (elLogisticsContainer) {
        elLogisticsContainer.innerHTML = `
          <div class="font-headline-sm text-headline-sm text-primary font-semibold">${commodity} • ${quantity} Qtl</div>
          <p class="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
            Buyer: ${buyerName}<br>
            ${logItem.origin ? 'From: ' + logItem.origin : ''}
            ${logItem.destination ? ' • To: ' + logItem.destination : ''}
          </p>
        `;
      }
      if (elLogisticsStatus) elLogisticsStatus.textContent = statusText;
      if (elLogisticsRef) elLogisticsRef.textContent = refId;
    }
  } catch (err) {
    console.error('Logistics fetch error:', err);
  }


  // 6. Fetch Government Mandi Data
  try {
    const meRes = await fetchApi('/api/auth/me');
    if (meRes && meRes.user && meRes.user.farmerProfile) {
      const state = meRes.user.farmerProfile.state;
      const city = meRes.user.farmerProfile.city;
      
      const elModal = document.getElementById('kpi-avg-market-price');
      const elMinMax = document.getElementById('kpi-best-nearby-price');
      const elMarket = document.getElementById('kpi-mandi-market');
      const elComm = document.getElementById('kpi-mandi-commodity-1');

      if (state && city) {
        // We assume Wheat as a default commodity to query, or we can use the most recent lot commodity
        let commodity = 'Wheat';
        if (lotsData && lotsData.lots && lotsData.lots.length > 0) {
          commodity = lotsData.lots[0].commodity.name;
        }

        if (elModal) elModal.innerHTML = `<span class="text-[16px] text-on-surface-variant animate-pulse">Fetching from data.gov.in...</span>`;
        if (elMinMax) elMinMax.innerHTML = `<span class="text-[16px] text-on-surface-variant animate-pulse">Fetching from data.gov.in...</span>`;
        
        let url = `/api/market-prices?state=${encodeURIComponent(state)}&district=${encodeURIComponent(city)}&commodity=${encodeURIComponent(commodity)}`;
        let mandiRes = await fetchApi(url);
        
        const isFallback = mandiRes && mandiRes.isFallback;
        
        const elSource = document.getElementById('kpi-source-label');
        if (elSource) {
          elSource.textContent = isFallback ? 'State-wide Government Mandi Data' : 'Government Mandi Data';
        }
        
        if (mandiRes && !mandiRes.error && mandiRes.markets && mandiRes.markets.length > 0) {
          let maxPrice = 0;
          let minPrice = Infinity;
          let bestMarket = '';
          
          mandiRes.markets.forEach(m => {
            const modal = parseFloat(m.modalPrice);
            const low = parseFloat(m.minPrice);
            if (modal > maxPrice) {
              maxPrice = modal;
              bestMarket = m.market;
            }
            if (low > 0 && low < minPrice) {
              minPrice = low;
            }
          });
          
          if (minPrice === Infinity) minPrice = maxPrice;

          const m = mandiRes.markets[0];
          if (elModal) elModal.innerHTML = `₹${maxPrice.toLocaleString('en-IN')}<span class="font-body-md text-on-surface-variant font-normal">/Qtl</span>`;
          if (elMinMax) elMinMax.innerHTML = `<span class="font-medium text-emerald-700">Max ₹${maxPrice.toLocaleString('en-IN')}</span> <span class="text-on-surface-variant px-1">•</span> <span class="font-medium text-red-700">Min ₹${minPrice.toLocaleString('en-IN')}</span>`;
          if (elMarket) elMarket.textContent = bestMarket || m.market;
          if (elComm) elComm.textContent = commodity + (m.variety ? ' (' + m.variety + ')' : '');
          
          const elDiff = document.getElementById('kpi-price-diff');
          if (elDiff) {
            const diff = maxPrice - minPrice;
            elDiff.textContent = diff > 0 ? `₹${diff} spread` : 'Uniform Pricing';
          }
          
          const elTrendRange = document.getElementById('kpi-trend-range');
          const elTrendUnit = document.getElementById('kpi-trend-unit');
          const elTrendMarkets = document.getElementById('kpi-trend-markets');
          const elTrendSubtitle = document.getElementById('kpi-trend-subtitle');
          if (elTrendRange) elTrendRange.textContent = `₹${minPrice.toLocaleString('en-IN')} – ₹${maxPrice.toLocaleString('en-IN')}`;
          if (elTrendUnit) elTrendUnit.textContent = '/ Qtl';
          if (elTrendMarkets) elTrendMarkets.textContent = `${mandiRes.markets.length} markets reporting`;
          if (elTrendSubtitle) {
            const spread = maxPrice - minPrice;
            elTrendSubtitle.textContent = spread > 0 ? `₹${spread.toLocaleString('en-IN')} market spread` : 'Uniform Pricing';
          }

        } else if (mandiRes && mandiRes.error) {
          if (elModal) elModal.innerHTML = `<span class="text-[16px] text-error">${mandiRes.error}</span>`;
          if (elMinMax) elMinMax.innerHTML = `<span class="text-[16px] text-error">API Error</span>`;
          if (elMarket) elMarket.textContent = 'Check connection';
          if (elComm) elComm.textContent = '';
          
          const elTrendMarkets = document.getElementById('kpi-trend-markets');
          if (elTrendMarkets) elTrendMarkets.textContent = 'API Error';
        } else {
          if (elModal) elModal.innerHTML = `<span class="text-[16px] text-on-surface-variant">No mandi data available for ${commodity} in ${state} today.</span>`;
          if (elMinMax) elMinMax.innerHTML = `<span class="text-[16px] text-on-surface-variant">No data available</span>`;
          if (elMarket) elMarket.textContent = 'No Mandi records found';
          if (elComm) elComm.textContent = commodity;
          
          const elTrendRange = document.getElementById('kpi-trend-range');
          const elTrendSubtitle = document.getElementById('kpi-trend-subtitle');
          const elTrendMarkets = document.getElementById('kpi-trend-markets');
          if (elTrendRange) elTrendRange.textContent = 'Data not available';
          if (elTrendSubtitle) elTrendSubtitle.textContent = 'Data not available';
          if (elTrendMarkets) elTrendMarkets.textContent = '0 markets reporting';
        }
      } else {
        if (elModal) elModal.innerHTML = `<span class="text-[16px] text-on-surface-variant">Location not set</span>`;
        if (elMinMax) elMinMax.innerHTML = `<span class="text-[16px] text-on-surface-variant">Location not set</span>`;
        if (elMarket) elMarket.textContent = "Please set your location to view nearby mandi prices.";
      }
    }
  } catch (err) {
    console.error('Mandi data fetch error:', err);
  }

});
