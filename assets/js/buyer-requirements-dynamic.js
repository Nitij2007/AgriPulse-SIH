document.addEventListener('DOMContentLoaded', async () => {
  // Interactive handlers for dashboard links to smooth app shell routing
  const actionLinks = document.querySelectorAll('a[data-path]');
  actionLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetPath = link.getAttribute('data-path');
      if (targetPath) {
        console.log(`Navigating to route: /${targetPath}`);
      }
    });
  });

  // Create Modal Logic
  const openCreateBtn = document.getElementById('openCreateModalBtn');
  const closeCreateBtn = document.getElementById('closeCreateModalBtn');
  const cancelCreateBtn = document.getElementById('cancelCreateModalBtn');
  const createModal = document.getElementById('createModal');

  const toggleCreateModal = (show) => {
    if (show) {
      createModal.classList.remove('hidden');
    } else {
      createModal.classList.add('hidden');
    }
  };

  if (openCreateBtn) openCreateBtn.addEventListener('click', () => toggleCreateModal(true));
  if (closeCreateBtn) closeCreateBtn.addEventListener('click', () => toggleCreateModal(false));
  if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', () => toggleCreateModal(false));

  // Detail Modal Logic
  const openDetailBtns = document.querySelectorAll('.open-detail-btn');
  const closeDetailBtn = document.getElementById('closeDetailModalBtn');
  const detailModal = document.getElementById('detailModal');

  const toggleDetailModal = (show) => {
    if (show) {
      detailModal.classList.remove('hidden');
    } else {
      detailModal.classList.add('hidden');
    }
  };

  openDetailBtns.forEach(btn => {
    btn.addEventListener('click', () => toggleDetailModal(true));
  });
  if (closeDetailBtn) closeDetailBtn.addEventListener('click', () => toggleDetailModal(false));

  // Backdrop click close
  [createModal, detailModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }
  });

  const token = sessionStorage.getItem('token');
  
  const cropSelect = document.getElementById('cropCommodity');
  const addSpecs = document.getElementById('additionalSpecs');
  if (cropSelect && addSpecs) {
    cropSelect.addEventListener('change', (e) => {
      const val = e.target.value.toLowerCase();
      if (val.includes('wheat') || val.includes('rice') || val.includes('maize') || val.includes('paddy') || val.includes('bajra')) {
        addSpecs.value = "Buyer-specified requirements may include variety, moisture, grain cleanliness and grade.";
      } else if (val.includes('tomato') || val.includes('onion') || val.includes('potato') || val.includes('apple') || val.includes('banana') || val.includes('cabbage')) {
        addSpecs.value = "Buyer-specified requirements may include size, firmness, maturity, cleanliness and acceptable damage.";
      } else {
        addSpecs.value = "Buyer-specified quality requirements.";
      }
    });
  }
  
  // Add logic for creating a requirement
  const form = createModal ? createModal.querySelector('form') : null;
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!token) {
          showToast('Authentication required. Please log in.', 'info');
          window.location.href = '../buyer-login.html';
          return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const originalHtml = btn.innerHTML;
      
      try {
        btn.disabled = true;
        btn.innerHTML = '<span>Publishing...</span>';
        
        const payload = {
          commodity: form.querySelector('#cropCommodity')?.value || 'Wheat',
          quantity: Number(form.querySelector('#quantityRequired')?.value || 0),
          unit: 'Quintal',
          price: Number(form.querySelector('#targetPrice')?.value || 0),
          qualitySpecs: form.querySelector('#additionalSpecs')?.value || '',
          locationPref: form.querySelector('#deliveryHub')?.value || 'Any'
        };

        console.log("POST /api/requirements Payload:", payload);

        const res = await fetch('/api/requirements', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            console.log('Requirement created:', data);
            if (typeof showToast === 'function') {
                showToast('Requirement published successfully!');
            }
            toggleCreateModal(false);
            form.reset();
            fetchAndRenderRequirements();
        } else {
            if (typeof showToast === 'function') { showToast('Error creating requirement: ' + (data.error || 'Unknown error'), 'error'); }
        }
      } catch (err) {
        console.error('API Error:', err);
        if (typeof showToast === 'function') { showToast('Failed to connect to backend server', 'error'); }
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });
  }

  const reqsContainer = document.getElementById('requirementsGrid');
  
  async function fetchAndRenderRequirements() {
    if (!token || !reqsContainer) return;
    
    try {
        const res = await fetch('/api/requirements', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        
        const reqs = data.requirements || [];
        
        // Update KPIs
        const activeKpi = document.getElementById('activeRequirementsKpi');
        const qtyKpi = document.getElementById('totalQuantityKpi');
        const supplyKpi = document.getElementById('matchingSupplyKpi');
        const fulfillKpi = document.getElementById('fulfillmentRateKpi');
        
        if (activeKpi) activeKpi.textContent = reqs.length;
        if (qtyKpi) qtyKpi.textContent = reqs.reduce((sum, req) => sum + (req.quantityNeeded || 0), 0) + ' Q';
        
        const fAll = document.getElementById('filter-all');
        const fActive = document.getElementById('filter-active');
        const fPartial = document.getElementById('filter-partial');
        const fFulfilled = document.getElementById('filter-fulfilled');
        const fClosed = document.getElementById('filter-closed');
        
        if (fAll) fAll.textContent = reqs.length;
        if (fActive) fActive.textContent = reqs.filter(r => r.status === 'ACTIVE').length;
        if (fPartial) fPartial.textContent = reqs.filter(r => r.status === 'PARTIALLY_FULFILLED').length;
        if (fFulfilled) fFulfilled.textContent = reqs.filter(r => r.status === 'FULFILLED').length;
        if (fClosed) fClosed.textContent = reqs.filter(r => r.status === 'CLOSED').length;
        
        if (reqs.length === 0) {
            reqsContainer.innerHTML = '<div class="col-span-full p-space-xl text-center bg-surface-container-low rounded-xl"><span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">assignment</span><h3 class="font-title-lg font-semibold text-primary mb-1">No active requirements</h3><p class="font-body-md text-on-surface-variant">Create your first procurement mandate to start receiving matching lots.</p></div>';
            return;
        }
        
        reqsContainer.innerHTML = reqs.map(req => {
          const dateStr = new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const reqId = `REQ-${req.id.substring(0, 8).toUpperCase()}`;
          return `
<div class="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg border border-surface-container-high/40 hover:border-outline-variant transition-colors">
<div class="flex-1 flex flex-col gap-space-xs">
<div class="flex flex-wrap items-center gap-space-xs">
<span class="font-metric-mono text-metric-mono uppercase tracking-wider px-space-xs py-space-3xs bg-surface-container-low text-on-surface-variant rounded font-semibold">#${reqId}</span>
<span class="font-title-lg text-title-lg text-primary font-semibold">${req.commodity ? req.commodity.name : 'Unknown'}</span>
<span class="px-space-xs py-space-3xs rounded-full bg-secondary-fixed-dim/30 text-on-secondary-fixed font-label-sm text-label-sm font-medium">${req.status}</span>
</div>
<div class="grid grid-cols-2 sm:grid-cols-4 gap-space-sm text-on-surface-variant font-body-sm text-body-sm mt-space-2xs">
<div><span class="text-outline">Quantity:</span> <span class="text-on-surface font-medium">${req.quantityNeeded} ${req.commodity ? req.commodity.unit : 'Qtl'}</span></div>
<div><span class="text-outline">Target Price:</span> <span class="text-on-surface font-medium">₹${req.maxPrice || 'N/A'}/${req.commodity ? req.commodity.unit : 'Q'}</span></div>
<div><span class="text-outline">Delivery Location:</span> <span class="text-on-surface font-medium truncate">${req.locationPref || 'Any'}</span></div>
<div><span class="text-outline">Required By:</span> <span class="text-on-surface font-medium">${dateStr}</span></div>
</div>
<div class="w-full mt-space-2xs">
<div class="flex items-center justify-between font-label-sm text-label-sm">
<span class="text-on-surface-variant">Fulfillment Progress</span>
<span class="font-semibold text-secondary">Not calculated</span>
</div>
</div>
</div>
<div class="flex flex-wrap items-center gap-space-xs shrink-0 pt-space-xs lg:pt-0">
<button class="open-detail-btn px-space-md py-space-xs rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container transition-colors cursor-pointer" data-req="${reqId}">
View Details
</button>
<button class="px-space-md py-space-xs rounded-lg bg-surface-container text-primary font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors cursor-pointer">
Edit
</button>
<a class="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors shadow-sm" data-path="buyer-matching-lots" href="matching-lots.html">
View Matching Lots
</a>
</div>
</div>`;
        }).join('');
        
        // Re-attach detail modal listeners
        const openDetailBtns = document.querySelectorAll('.open-detail-btn');
        openDetailBtns.forEach(btn => {
          btn.addEventListener('click', () => {
             const detailModal = document.getElementById('detailModal');
             const modalReqId = document.getElementById('modalReqId');
             if(modalReqId) modalReqId.textContent = '#' + btn.getAttribute('data-req');
             if(detailModal) detailModal.classList.remove('hidden');
          });
        });
        
    } catch (err) {
        console.error('Error fetching reqs:', err);
    }
  }
  
  // Initial fetch
  fetchAndRenderRequirements();
});
