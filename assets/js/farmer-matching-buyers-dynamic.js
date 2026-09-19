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

  const emptyGrid = `<div class="col-span-full p-8 text-center bg-surface-container-low rounded-xl text-on-surface-variant">No active buyer matches<br><span class="text-sm">New buyer requirements will appear here when they match your registered produce lots.</span></div>`;
  const emptyRow = `<tr><td colspan="8" class="text-center py-8 text-on-surface-variant">No active buyer matches. New buyer requirements will appear here when they match your registered produce lots.</td></tr>`;

  const gridContainer = document.getElementById('dynamic-matched-buyers-grid');
  const tableContainer = document.getElementById('dynamic-matched-buyers-table');

  // Fetch both lots and matches
  const [lotsData, matchData] = await Promise.all([
    fetchApi('/api/lots'),
    fetchApi('/api/matching/buyers')
  ]);

  const activeLots = (lotsData?.lots || []).filter(l => l.status === 'LISTED');
  
  if (activeLots.length === 0) {
    const lotNameEl = document.getElementById('focusLotId');
    if (lotNameEl) lotNameEl.textContent = 'No Active Lots';
    const detailLine = document.querySelector('.flex.flex-wrap.items-center.gap-x-space-md.gap-y-1.mt-1');
    if (detailLine) detailLine.innerHTML = `<span>You do not have any active lots listed for trade.</span>`;
    
    if (gridContainer) gridContainer.innerHTML = emptyGrid;
    if (tableContainer) tableContainer.innerHTML = emptyRow;
    updateKPIs(0, []);
    return;
  }

  let currentLotIndex = 0;

  const changeLotBtn = document.getElementById('changeLotBtn');
  if (changeLotBtn) {
    changeLotBtn.addEventListener('click', () => {
      currentLotIndex = (currentLotIndex + 1) % activeLots.length;
      renderSelectedLot();
    });
    if (activeLots.length <= 1) {
      changeLotBtn.style.display = 'none';
    }
  }

  function getCleanQualitySpecs(specs) {
    if (!specs) return 'Quality requirements as specified by buyer.';
    // Remove the known mock AGMARK claim
    if (specs.includes('AGMARK Grade-1 Sharbati specifications')) {
      return 'Quality requirements as specified by buyer.';
    }
    return specs;
  }

  function renderSelectedLot() {
    const lot = activeLots[currentLotIndex];
    
    const lotNameEl = document.getElementById('focusLotId');
    if (lotNameEl) lotNameEl.textContent = 'Lot #' + lot.id.substring(0, 8).toUpperCase();
    
    const cropName = lot.commodity ? lot.commodity.name : 'Produce';
    const dynamicHeading = document.getElementById('dynamic-matching-heading');
    if (dynamicHeading) {
      dynamicHeading.textContent = `Matching ${cropName} requirements`;
    }

    const detailLine = document.querySelector('.flex.flex-wrap.items-center.gap-x-space-md.gap-y-1.mt-1');
    if (detailLine) {
      detailLine.innerHTML = `
        <span>Commodity: <strong class="text-on-surface font-semibold">${cropName}</strong></span>
        <span>Volume: <strong class="text-on-surface font-semibold">${lot.quantity} ${lot.unit}</strong></span>
        <span>Quality: <strong class="text-on-surface font-semibold">${lot.grade || 'Standard'}</strong></span>
        <span>Location: <strong class="text-on-surface font-semibold">${lot.location || 'Farm Gate'}</strong></span>
        <span>Listing Price: <strong class="text-primary font-semibold">₹${(lot.listingPrice || 0).toLocaleString('en-IN')} / ${lot.unit}</strong></span>
      `;
    }

    // Find matches for this lot specifically
    let lotMatches = [];
    if (matchData && matchData.matches) {
      const matchObj = matchData.matches.find(m => m.lot.id === lot.id);
      if (matchObj && matchObj.matchingRequirements) {
        lotMatches = matchObj.matchingRequirements;
      }
    }

    renderMatches(lotMatches);
    
    // As per user instructions: "If the selected lot has 2 actual matching buyer requirements, show: 2 Tenders Active, 2 Matched Mandates, 2 buyer cards, 2 table rows"
    // Use lotMatches.length for counts, not total unique across all lots.
    updateKPIs(lotMatches.length, lotMatches);
  }

  function renderMatches(lotMatches) {
    if (lotMatches.length === 0) {
      if (gridContainer) gridContainer.innerHTML = emptyGrid;
      if (tableContainer) tableContainer.innerHTML = emptyRow;
      return;
    }

    if (gridContainer) {
      gridContainer.innerHTML = lotMatches.map(req => `
        <div class="rounded-xl bg-surface-container-lowest shadow-md flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
          <div class="h-2 w-full bg-secondary"></div>
          <div class="p-space-lg flex flex-col flex-1">
            <div class="flex items-start justify-between gap-space-xs mb-space-sm">
              <div>
                <div class="flex items-center gap-space-xs">
                  <span class="inline-flex items-center gap-1 px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                    <span class="material-symbols-outlined text-[14px]">verified</span> Registered Buyer
                  </span>
                </div>
                <h3 class="font-headline-sm text-headline-sm text-primary font-bold mt-space-xs">${req.buyerName}</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant">${req.buyerType || 'Procurement Partner'}</p>
              </div>
              <div class="flex flex-col items-end">
                <div class="w-12 h-12 rounded-xl bg-primary-container text-primary-fixed font-title-lg text-title-lg font-bold flex items-center justify-center shadow-sm">
                  ${req.matchScore || 100}%
                </div>
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase mt-1">Lot Match</span>
              </div>
            </div>
            <div class="p-space-sm rounded-xl bg-surface-container-low space-y-space-xs my-space-xs">
              <div class="flex justify-between items-center text-body-sm font-body-sm">
                <span class="text-on-surface-variant">Procurement Volume</span>
                <span class="font-semibold text-primary">${req.quantityNeeded} Qtl Required</span>
              </div>
              <div class="flex justify-between items-center text-body-sm font-body-sm">
                <span class="text-on-surface-variant">Quality Requirement</span>
                <span class="font-semibold text-on-surface">${getCleanQualitySpecs(req.qualitySpecs)}</span>
              </div>
              <div class="flex justify-between items-center text-body-sm font-body-sm">
                <span class="text-on-surface-variant">Indicative Tender Bid</span>
                <span class="font-metric-mono text-metric-mono font-bold text-secondary">${req.maxPrice ? 'Max ₹' + req.maxPrice.toLocaleString('en-IN') + ' / Qtl' : 'Not specified'}</span>
              </div>
              <div class="flex justify-between items-center text-body-sm font-body-sm">
                <span class="text-on-surface-variant">Logistics Distance</span>
                <span class="font-semibold text-on-surface">${req.locationPref || 'Not specified'}</span>
              </div>
            </div>
            <div class="mt-auto pt-space-md flex items-center gap-space-xs">
              <button class="flex-1 py-2.5 px-space-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors shadow-sm text-center" type="button">
                Simulated Offer →
              </button>
              <button class="p-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors" title="View Buyer Profile" type="button">
                <span class="material-symbols-outlined text-[20px]">corporate_fare</span>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }

    if (tableContainer) {
      tableContainer.innerHTML = lotMatches.map(req => `
        <tr class="hover:bg-surface-container-low transition-colors">
          <td class="py-4 px-space-md font-semibold text-primary">
            <div class="flex items-center gap-space-xs">
              <span class="material-symbols-outlined text-secondary text-[18px]">verified</span>
              <div>
                <span class="block">${req.buyerName}</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant font-normal">${req.buyerType || 'Procurement Partner'}</span>
              </div>
            </div>
          </td>
          <td class="py-4 px-space-md font-semibold text-on-surface">${req.quantityNeeded} Qtl</td>
          <td class="py-4 px-space-md text-on-surface">${getCleanQualitySpecs(req.qualitySpecs)}</td>
          <td class="py-4 px-space-md font-metric-mono text-metric-mono font-bold text-secondary">
            ${req.maxPrice ? 'Max ₹' + req.maxPrice.toLocaleString('en-IN') : 'Not specified'}
          </td>
          <td class="py-4 px-space-md text-on-surface">${req.locationPref || 'Not specified'}</td>
          <td class="py-4 px-space-md">
            <span class="inline-flex px-space-xs py-space-3xs rounded-full bg-tertiary-fixed text-tertiary-container font-label-sm text-label-sm font-semibold">Matched</span>
          </td>
          <td class="py-4 px-space-md">
            <span class="inline-flex items-center px-space-xs py-space-3xs rounded-md bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold">${req.matchScore || 100}%</span>
          </td>
          <td class="py-4 px-space-md text-right">
            <button class="px-space-md py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors shadow-sm" type="button">
              View
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  function updateKPIs(currentLotMatchCount, currentLotMatches) {
    const kpiTenders = document.getElementById('kpi-active-tenders');
    if (kpiTenders) kpiTenders.textContent = currentLotMatchCount;

    // Corporate millers (unique buyers for this lot)
    const uniqueBuyers = new Set();
    currentLotMatches.forEach(r => uniqueBuyers.add(r.buyerName));
    const kpiCorp = document.getElementById('kpi-corporate-millers');
    if (kpiCorp) kpiCorp.textContent = uniqueBuyers.size;

    const headerMandates = document.getElementById('header-matched-mandates');
    if (headerMandates) headerMandates.textContent = `${currentLotMatchCount} Matched Mandates`;

    const kpiPriceSpread = document.getElementById('kpi-price-spread');
    if (kpiPriceSpread) {
      const prices = currentLotMatches.map(r => r.maxPrice).filter(p => p > 0);
      if (prices.length > 0) {
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        kpiPriceSpread.innerHTML = '₹' + minP.toLocaleString('en-IN') + ' – ₹' + maxP.toLocaleString('en-IN') + ' <span class="font-body-sm text-body-sm font-normal text-on-surface-variant">/ Qtl</span>';
      } else {
        kpiPriceSpread.innerHTML = 'Not specified';
      }
    }
  }

  renderSelectedLot();
});
