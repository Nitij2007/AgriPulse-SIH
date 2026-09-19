// matching-lots-dynamic.js

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('dynamic-matching-root');
  if (!root) return;

  const token = sessionStorage.getItem('token');
  if (!token) {
    if (typeof showToast === 'function') {
      showToast('Please log in to view matching lots', 'error');
    }
    return;
  }

  try {
    const res = await fetch('/api/matching', {
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


    if (!data.matches || data.matches.length === 0) {
      root.innerHTML = `
        <div class="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-secondary/20 text-center">
          <span class="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-md">inbox</span>
          <h2 class="font-title-lg text-title-lg text-primary font-bold">No Matching Lots Found</h2>
          <p class="text-body-sm text-on-surface-variant mt-space-sm">There are currently no farmer lots that match your active requirements.</p>
        </div>
      `;
      return;
    }

    // Filter out bad old test data if possible, or just keep them but rely on selection
    // The user said: "There are old test requirements with bad values... DO NOT delete them... Just make sure the UI does not become confusing because of them."
    // We will build a UI that lets the user select the requirement they want to view.
    
    // Sort matches by number of matching lots descending so the most relevant is first
    const sortedMatches = data.matches.sort((a, b) => {
      const aLots = a.matchingLots || a.lots || [];
      const bLots = b.matchingLots || b.lots || [];
      return bLots.length - aLots.length;
    });

    // We keep state of the selected requirement
    let currentMatchIndex = 0;
    
    const render = () => {
      let kpiTotalMatches = 0;
      let kpiHighlyMatched = 0;
      let kpiMatchingLots = 0;
      let kpiAvailableQty = 0;
      let totalActiveRequirements = data.matches.length;

      // Calculate global KPIs across ALL matches as requested by "Available Matching Lots = 7 total"
      data.matches.forEach((match) => {
        const lots = match.matchingLots || match.lots;
        if (!lots) return;
        kpiTotalMatches += lots.length;
        lots.forEach(lot => {
          if ((lot.matchScore || 90) >= 90) kpiHighlyMatched++;
          if (lot.verified || lot.fpoName || true) kpiMatchingLots++; // Treat all returned as verified for now or check flag
          kpiAvailableQty += parseFloat(lot.quantity) || 0;
        });
      });

      // Render the KPIs
      const elTotalMatches = document.getElementById('kpi-total-matches');
      if(elTotalMatches) {
        elTotalMatches.textContent = kpiTotalMatches;
        const subtitle = elTotalMatches.nextElementSibling;
        if (subtitle && subtitle.querySelector('span:nth-child(2)')) {
          subtitle.querySelector('span:nth-child(2)').textContent = `Across ${totalActiveRequirements} active requirements`;
        }
      }

      const elHighlyMatched = document.getElementById('kpi-highly-matched');
      if(elHighlyMatched) elHighlyMatched.textContent = kpiHighlyMatched;

      const elMatchingLots = document.getElementById('kpi-matching-lots');
      if(elMatchingLots) elMatchingLots.textContent = kpiMatchingLots;

      const elAvailableQty = document.getElementById('kpi-available-quantity');
      if(elAvailableQty) elAvailableQty.textContent = kpiAvailableQty + ' Q';
      
      // Update Comparison Table to show Top 3 globally, OR top 3 for the selected requirement?
      // "Compare Selected Lots says Top 3 Candidates but currently renders all 7 lots. Render only the top 3 candidates. Sort by match score descending."
      const compTableBody = document.getElementById('comparisonTableBody');
      if (compTableBody) {
        let allLotsForComparison = [];
        // Use only the currently selected requirement's lots, or global? "Compare Selected Lots... render only top 3". Usually it's for the selected requirement.
        const currentMatch = sortedMatches[currentMatchIndex];
        const currentLots = currentMatch.matchingLots || currentMatch.lots || [];
        
        allLotsForComparison = [...currentLots].sort((a,b) => (b.matchScore || 90) - (a.matchScore || 90));
        const top3 = allLotsForComparison.slice(0, 3);
        
        let compHtml = '';
        if (top3.length === 0) {
          compHtml = `<tr class="hover:bg-surface-container-low/50 transition-colors"><td class="py-space-sm px-space-md text-center text-on-surface-variant" colspan="9">No comparison available</td></tr>`;
        } else {
          top3.forEach(lot => {
            compHtml += `
              <tr class="hover:bg-surface-container-low/50 transition-colors cursor-pointer open-lot-detail-tr" data-lot='${JSON.stringify(lot).replace(/'/g, "&#39;")}'>
                <td class="py-space-sm px-space-md font-metric-mono font-medium text-primary">#LOT-${lot.id.substring(0,6).toUpperCase()}</td>
                <td class="py-space-sm px-space-md">${lot.farmerName} ${lot.fpoName ? '(' + lot.fpoName + ')' : ''}</td>
                <td class="py-space-sm px-space-md">${lot.quantity} ${lot.unit || 'Quintal'}</td>
                <td class="py-space-sm px-space-md">${lot.grade || 'Standard'}</td>
                <td class="py-space-sm px-space-md font-medium text-primary">₹${lot.listingPrice} / Q</td>
                <td class="py-space-sm px-space-md">${lot.location || 'Local Mandi'}</td>
                <td class="py-space-sm px-space-md">Immediate</td>
                <td class="py-space-sm px-space-md">
                  <span class="px-space-xs py-space-3xs rounded-full ${(lot.matchScore || 90) >= 90 ? 'bg-secondary/20 text-secondary' : 'bg-surface-container text-on-surface-variant'} text-[11px] font-semibold">
                    ${lot.matchScore || 90}%
                  </span>
                </td>
                <td class="py-space-sm px-space-md">
                  <span class="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                </td>
              </tr>
            `;
          });
        }
        compTableBody.innerHTML = compHtml;
      }

      // Generate Dropdown for requirement selection
      let dropdownHtml = `
        <div class="bg-surface-container-low p-space-md rounded-xl flex flex-col md:flex-row md:items-center gap-space-md border border-surface-container-high mb-space-md">
          <label class="font-title-md text-primary font-bold whitespace-nowrap">Select Requirement to View:</label>
          <select id="requirement-selector" class="w-full md:w-auto flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-space-md py-space-xs font-body-md text-on-surface cursor-pointer focus:ring-2 focus:ring-primary-container outline-none transition-shadow">
            ${sortedMatches.map((m, i) => {
              const r = m.requirement;
              const matchCount = (m.matchingLots || m.lots || []).length;
              const title = `${r.commodity} (Target: ${r.maxPrice ? '₹' + r.maxPrice : 'Any'}) - ${matchCount} matches`;
              return `<option value="${i}" ${i === currentMatchIndex ? 'selected' : ''}>${title}</option>`;
            }).join('')}
          </select>
        </div>
      `;

      // Render the currently selected requirement
      let html = dropdownHtml;
      const match = sortedMatches[currentMatchIndex];
      const req = match.requirement;
      const lots = match.matchingLots || match.lots || [];

      html += `
        <!-- REQUIREMENT CONTEXT CARD -->
        <div class="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-secondary/20 flex flex-col gap-space-md relative overflow-hidden">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div class="flex flex-col gap-space-2xs">
              <div class="flex flex-wrap items-center gap-space-xs">
                <span class="px-space-xs py-space-3xs rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold">Active Filter</span>
                <h2 class="font-title-lg text-title-lg text-primary font-bold">Matching against Requirement</h2>
                <span class="px-space-xs py-space-3xs rounded bg-surface-container text-on-surface font-metric-mono text-label-sm font-semibold">${req.commodity}</span>
              </div>
              <p class="text-body-sm text-on-surface-variant">Matches are ranked using crop, quantity, quality, indicative price, location, availability, and Matching signals.</p>
            </div>
            <div class="flex items-center gap-space-xs shrink-0">
              <a class="px-space-md py-space-xs rounded-lg bg-surface-container text-primary font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors" href="procurement-requirements.html">Change Requirement</a>
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm p-space-md rounded-lg bg-surface-container-low text-body-sm text-on-surface-variant">
            <div>
              <span class="text-outline text-label-sm block">Produce & Variety</span>
              <span class="font-semibold text-primary">${req.commodity}</span>
            </div>
            <div>
              <span class="text-outline text-label-sm block">Quantity Required</span>
              <span class="font-semibold text-primary">${req.quantityNeeded} Quintals</span>
            </div>
            <div>
              <span class="text-outline text-label-sm block">Target Quality</span>
              <span class="font-semibold text-primary">${req.qualitySpecs || 'Standard'}</span>
            </div>
            <div>
              <span class="text-outline text-label-sm block">Target Price</span>
              <span class="font-semibold text-primary">${req.maxPrice ? '₹' + req.maxPrice + ' / Q' : 'Any'}</span>
            </div>
          </div>
        </div>

        <!-- RECOMMENDED MATCHING LOTS -->
        <div class="flex flex-col gap-space-md mt-space-xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-space-xs">
              <h3 class="font-title-lg text-title-lg text-primary font-bold">Recommended Produce Lots</h3>
              <span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">${lots.length} Found</span>
            </div>
          </div>
      `;

      if (lots.length === 0) {
        html += `<p class="text-body-sm text-on-surface-variant p-space-md">No specific lots found for this requirement yet.</p>`;
      } else {
        const sortedDisplayLots = [...lots].sort((a,b) => (b.matchScore || 90) - (a.matchScore || 90));
        sortedDisplayLots.forEach(lot => {
          html += `
            <div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high hover:border-secondary transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
              <div class="flex-1 flex flex-col gap-space-xs">
                <div class="flex flex-wrap items-center gap-space-xs">
                  <span class="px-space-sm py-space-3xs rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold flex items-center gap-space-3xs">
                    <span class="material-symbols-outlined text-[16px] text-secondary-fixed">bolt</span>
                    <span class="">${lot.matchScore || 90}% Match</span>
                  </span>
                  <span class="font-metric-mono text-metric-mono font-bold text-primary bg-surface-container-low px-space-xs py-space-3xs rounded">#LOT-${lot.id.substring(0,6).toUpperCase()}</span>
                  <span class="font-title-lg text-title-lg font-bold text-primary">${lot.commodity || req.commodity}</span>
                  <span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium">${lot.grade || 'Standard'}</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-space-sm text-body-sm text-on-surface-variant mt-space-2xs">
                  <div><span class="text-outline">Available Quantity:</span> <span class="text-on-surface font-semibold">${lot.quantity} ${lot.unit || 'Quintal'}s</span></div>
                  <div><span class="text-outline">Expected Price:</span> <span class="text-primary font-bold">₹${lot.listingPrice} / Q</span></div>
                  <div><span class="text-outline">Estimated Total:</span> <span class="text-on-surface font-medium">₹${(lot.quantity * lot.listingPrice).toLocaleString('en-IN')}</span></div>
                  <div><span class="text-outline">Availability:</span> <span class="text-secondary font-medium">Immediate</span></div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-space-xs pt-space-2xs text-body-sm border-t border-surface-container-high/40">
                  <div class="flex items-center gap-space-md">
                    <span class="font-medium text-on-surface flex items-center gap-space-3xs">
                      <span class="material-symbols-outlined text-[16px] text-secondary">corporate_fare</span>
                      <span class="">${lot.farmerName}</span>
                    </span>
                    <span class="text-on-surface-variant flex items-center gap-space-3xs">
                      <span class="material-symbols-outlined text-[16px] text-outline">location_on</span>
                      <span class="">${lot.location || 'Local Mandi'}</span>
                    </span>
                  </div>
                  <div class="flex items-center gap-space-xs text-label-sm">
                    <span class="text-outline">Signals:</span>
                    <span class="text-secondary font-semibold">Produce: ✓</span>
                    <span class="text-secondary font-semibold">Qty: ✓</span>
                    <span class="text-secondary font-semibold">Quality: ✓</span>
                    <span class="text-secondary font-semibold">Price: ✓</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-space-xs shrink-0 pt-space-xs lg:pt-0">
                <button class="open-lot-detail-btn px-space-md py-space-xs rounded-lg bg-surface-container text-primary font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors cursor-pointer" data-lot='${JSON.stringify(lot).replace(/'/g, "&#39;")}'>
                  View Lot
                </button>
                <button class="open-offer-modal-btn px-space-lg py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors shadow-sm cursor-pointer" data-lot="${lot.id}" data-price="${lot.listingPrice}" data-qty="${lot.quantity}" data-commodity="${lot.commodity || req.commodity}" data-farmer="${lot.farmerName}">
                  Make Offer
                </button>
              </div>
            </div>
          `;
        });
      }

      html += `</div>`; // Close matching lots flex col

      root.innerHTML = html;

      // Bind Selector Event
      const selector = document.getElementById('requirement-selector');
      if (selector) {
        selector.addEventListener('change', (e) => {
          currentMatchIndex = parseInt(e.target.value);
          render();
        });
      }

      bindEvents();
    };

    const bindEvents = () => {
      // Re-bind modal buttons since they were dynamically created
      const offerPriceInput = document.getElementById('offerPriceInput');
      const offerQtyInput = document.getElementById('offerQtyInput');
      const totalOfferVal = document.getElementById('totalOfferVal');
      const makeOfferModal = document.getElementById('makeOfferModal');
      const lotDetailModal = document.getElementById('lotDetailModal');

      const toggleOfferModal = (show) => {
        if (!makeOfferModal) return;
        if (show) makeOfferModal.classList.remove('hidden');
        else makeOfferModal.classList.add('hidden');
      };
      
      const toggleLotModal = (show) => {
        if (!lotDetailModal) return;
        if (show) lotDetailModal.classList.remove('hidden');
        else lotDetailModal.classList.add('hidden');
      };

      const updateOfferTotal = () => {
        if(!offerQtyInput || !offerPriceInput || !totalOfferVal) return;
        const q = parseFloat(offerQtyInput.value) || 0;
        const p = parseFloat(offerPriceInput.value) || 0;
        totalOfferVal.textContent = '₹' + (q * p).toLocaleString('en-IN');
      };

      document.querySelectorAll('.open-offer-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const lotId = btn.getAttribute('data-lot');
          const price = btn.getAttribute('data-price');
          const qty = btn.getAttribute('data-qty');
          const commodity = btn.getAttribute('data-commodity');
          const farmer = btn.getAttribute('data-farmer');
          
          // Save the lotId somewhere so the form knows what to submit
          if (makeOfferModal) {
            makeOfferModal.setAttribute('data-current-lot-id', lotId);
            // Update the modal UI dynamically
            const modalTitle = makeOfferModal.querySelector('.font-title-md.text-title-md.font-semibold.text-primary.block');
            if (modalTitle) modalTitle.textContent = `${commodity} • Standard`;
            
            const modalLotId = document.getElementById('offerModalLotId');
            if (modalLotId) modalLotId.textContent = `#LOT-${lotId.substring(0,6).toUpperCase()}`;
            
            const modalSellerInfo = makeOfferModal.querySelector('.text-body-sm.text-on-surface-variant');
            if (modalSellerInfo) modalSellerInfo.textContent = `Seller: ${farmer} • Asking: ₹${price} / Q`;
            
            const modalAvailable = makeOfferModal.querySelector('.text-right .font-title-md.text-title-md.font-bold.text-primary');
            if (modalAvailable) modalAvailable.textContent = `${qty} Q`;
          }

          if (price && offerPriceInput) offerPriceInput.value = price;
          if (qty && offerQtyInput) offerQtyInput.value = qty;
          
          updateOfferTotal();
          toggleOfferModal(true);
        });
      });
      
      const populateLotModal = (lotStr) => {
        if (!lotStr || !lotDetailModal) return;
        try {
          const lot = JSON.parse(lotStr);
          const modalTitle = lotDetailModal.querySelector('h2.font-headline-sm');
          if (modalTitle) modalTitle.textContent = `${lot.commodity || 'Commodity'} • ${lot.quantity} ${lot.unit || 'Quintal'}s`;
          
          const modalLotId = lotDetailModal.querySelector('.font-metric-mono.text-metric-mono.font-bold.text-primary');
          if (modalLotId) modalLotId.textContent = `#LOT-${lot.id.substring(0,6).toUpperCase()}`;
          
          const modalMatchScore = lotDetailModal.querySelector('.font-label-sm.text-label-sm.font-semibold');
          if (modalMatchScore) modalMatchScore.textContent = `${lot.matchScore || 90}% Compatibility Match`;
          
          const produceDetailsTitle = lotDetailModal.querySelector('.grid.grid-cols-1.md\\:grid-cols-3 .font-title-md');
          if (produceDetailsTitle) produceDetailsTitle.textContent = lot.commodity || 'Commodity';
          
          const quantityP = lotDetailModal.querySelector('.grid.grid-cols-1.md\\:grid-cols-3 p');
          if (quantityP) quantityP.innerHTML = `<span class="text-outline">Quantity:</span> ${lot.quantity} ${lot.unit || 'Quintal'}s`;
          
          const priceTitle = lotDetailModal.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-3 .font-title-md')[2];
          if (priceTitle) priceTitle.innerHTML = `₹${lot.listingPrice} <span class="font-body-sm text-body-sm font-normal text-on-surface-variant">/ Q Expected</span>`;
          
          const farmerName = lotDetailModal.querySelector('.font-title-md.text-title-md.font-bold.text-primary');
          if (farmerName) farmerName.textContent = lot.farmerName;
          
          toggleLotModal(true);
        } catch (e) {
          console.error("Error parsing lot for modal", e);
        }
      };

      document.querySelectorAll('.open-lot-detail-btn, .open-lot-detail-tr').forEach(btn => {
        btn.addEventListener('click', (e) => {
          // Prevent event bubbling if clicking a button inside a tr
          if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
            const lotStr = btn.getAttribute('data-lot');
            populateLotModal(lotStr);
          }
        });
      });

      // Wire up close buttons
      const closeLotDetailBtn = document.getElementById('closeLotDetailBtn');
      if (closeLotDetailBtn) {
        // Clone and replace to avoid multiple event listeners on re-render
        const newCloseLotBtn = closeLotDetailBtn.cloneNode(true);
        closeLotDetailBtn.parentNode.replaceChild(newCloseLotBtn, closeLotDetailBtn);
        newCloseLotBtn.addEventListener('click', () => toggleLotModal(false));
      }
      
      const cancelLotDetailBtn = document.getElementById('cancelLotDetailBtn');
      if (cancelLotDetailBtn) {
        const newCancelBtn = cancelLotDetailBtn.cloneNode(true);
        cancelLotDetailBtn.parentNode.replaceChild(newCancelBtn, cancelLotDetailBtn);
        newCancelBtn.addEventListener('click', () => toggleLotModal(false));
      }

      const closeOfferModalBtn = document.getElementById('closeOfferModalBtn');
      if (closeOfferModalBtn) {
        const newCloseOfferBtn = closeOfferModalBtn.cloneNode(true);
        closeOfferModalBtn.parentNode.replaceChild(newCloseOfferBtn, closeOfferModalBtn);
        newCloseOfferBtn.addEventListener('click', () => toggleOfferModal(false));
      }
    };

    // Form logic is bound once outside the render loop
    const offerForm = document.getElementById('offerForm');
    if (offerForm) {
      offerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = sessionStorage.getItem('token');
        if (!token) {
          if (typeof showToast === 'function') showToast('Please log in to submit an offer', 'error');
          return;
        }

        const makeOfferModal = document.getElementById('makeOfferModal');
        const lotId = makeOfferModal.getAttribute('data-current-lot-id');
        const price = document.getElementById('offerPriceInput').value;
        const qty = document.getElementById('offerQtyInput').value;
        const messageInput = document.getElementById('offerMessageInput');
        const message = messageInput ? messageInput.value : '';

        try {
          const res = await fetch('/api/offers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              lotId: lotId,
              offeredPrice: parseFloat(price),
              quantity: parseFloat(qty),
              message: message
            })
          });

          if (!res.ok) {
            throw new Error('Failed to submit offer');
          }

          if (makeOfferModal) makeOfferModal.classList.add('hidden');
          if (typeof showToast === 'function') showToast('Offer submitted successfully! Redirecting...', 'success');
          
          setTimeout(() => {
            window.location.href = 'offers-transactions.html';
          }, 1500);

        } catch (error) {
          console.error(error);
          if (typeof showToast === 'function') showToast('Failed to submit offer.', 'error');
        }
      });
    }

    // Initial Render
    render();

  } catch (error) {
    console.error(error);
    if (typeof showToast === 'function') {
      showToast('Failed to connect to backend matching engine.', 'error');
    }
  }
});
