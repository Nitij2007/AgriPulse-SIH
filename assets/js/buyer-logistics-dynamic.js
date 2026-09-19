let allLogistics = [];

document.addEventListener('DOMContentLoaded', async () => {
  await fetchMyLogistics();
});

async function fetchMyLogistics() {
  const token = sessionStorage.getItem('token');
  if (!token) {
    if (typeof showToast === 'function') {
      showToast('Please log in to view logistics', 'error');
    }
    return;
  }

  try {
    const res = await fetch('/api/logistics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to fetch logistics');
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

    allLogistics = data.logistics || [];
    renderLogisticsCards(allLogistics);
    updateLogisticsKPIs(allLogistics);
  } catch (err) {
    console.error('Fetch Logistics Error:', err);
  }
}

function renderLogisticsCards(logisticsArray) {
  const container = document.getElementById('activeLogisticsCardsContainer');
  if (!container) return;

  if (logisticsArray.length === 0) {
    container.innerHTML = `
      <div class="p-space-xl text-center rounded-xl bg-surface-container-lowest border border-surface-container-high border-dashed">
        <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-space-sm">local_shipping</span>
        <h3 class="font-title-md text-title-md text-on-surface font-semibold mb-space-2xs">No active logistics</h3>
        <p class="font-body-md text-body-md text-on-surface-variant">Logistics will appear here once transactions are accepted and payment is secured.</p>
      </div>
    `;
    return;
  }

  let html = '';
  logisticsArray.forEach(log => {
    const txn = log.transaction || {};
    const lot = txn.lot || {};
    const crop = lot.commodity?.name || 'Unknown Produce';
    const quantity = txn.offer?.quantity || 0;
    const seller = lot.farmer?.name || 'Unknown Seller';
    
    const txnIdDisplay = `TXN-${txn.id.substring(0, 6).toUpperCase()}`;
    
    const destinationDisplay = (log.destination && log.destination !== 'undefined' && log.destination !== 'null' && log.destination !== '[object Object]') ? log.destination : 'Destination not specified';
    const originDisplay = (log.origin && log.origin !== 'undefined' && log.origin !== 'null' && log.origin !== '[object Object]') ? log.origin : 'Origin not specified';
    const carrierDisplay = (log.carrierName && log.carrierName !== 'undefined' && log.carrierName !== 'null' && log.carrierName !== '[object Object]') ? log.carrierName : 'TBD';
    const vehicleDisplay = (log.vehicleNumber && log.vehicleNumber !== 'undefined' && log.vehicleNumber !== 'null' && log.vehicleNumber !== '[object Object]') ? log.vehicleNumber : 'No Vehicle Assigned';
    
    // Status formatting
    let stepClassArranged = 'opacity-50', stepClassPickup = 'opacity-50', stepClassTransit = 'opacity-50', stepClassDelivered = 'opacity-50';
    let stepActiveHTML = '';

    if (log.status === 'PENDING') {
      stepActiveHTML = `<span class="font-body-sm text-body-sm text-secondary font-medium">Pending Transport</span>`;
    } else if (log.status === 'ASSIGNED') {
      stepClassArranged = '';
      stepActiveHTML = `<span class="font-title-md text-title-md text-primary font-bold">Transport Logged</span>
                        <span class="font-body-sm text-body-sm text-secondary font-medium">Vehicle Assigned</span>`;
    } else if (log.status === 'IN_TRANSIT') {
      stepClassArranged = ''; stepClassPickup = ''; stepClassTransit = '';
      stepActiveHTML = `<span class="font-title-md text-title-md text-primary font-bold">In Transit</span>
                        <span class="font-body-sm text-body-sm text-secondary font-medium">Corridor Active</span>`;
    } else if (log.status === 'DELIVERED') {
      stepClassArranged = ''; stepClassPickup = ''; stepClassTransit = ''; stepClassDelivered = '';
      stepActiveHTML = `<span class="font-title-md text-title-md text-primary font-bold">Delivered</span>
                        <span class="font-body-sm text-body-sm text-secondary font-medium">Completed</span>`;
    }

    html += `
      <div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow flex flex-col gap-space-lg">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm pb-space-sm bg-surface-container-low/40 rounded-lg p-space-sm">
          <div class="flex flex-wrap items-center gap-space-xs">
            <span class="px-space-xs py-space-3xs rounded-full bg-primary text-on-primary font-metric-mono text-metric-mono font-semibold">${txnIdDisplay}</span>
            <span class="font-title-lg text-title-lg text-primary font-bold">${crop}</span>
            <span class="text-on-surface-variant">•</span>
            <span class="font-metric-mono text-metric-mono text-on-surface font-medium">${quantity} Quintals</span>
          </div>
          <div class="flex items-center gap-space-xs">
            <span class="px-space-sm py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase font-semibold flex items-center gap-space-2xs">
              <span class="w-1.5 h-1.5 rounded-full bg-secondary ${log.status !== 'DELIVERED' ? 'animate-pulse' : ''}"></span>
              ${log.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <div class="flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
              <span class="material-symbols-outlined text-[20px]">store</span>
            </div>
            <div>
              <div class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Seller & Dispatch Point</div>
              <div class="font-title-md text-title-md text-on-surface font-semibold">${seller}</div>
              <div class="font-body-sm text-body-sm text-on-surface-variant mt-space-3xs">${originDisplay}</div>
            </div>
          </div>

          <div class="flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
              <span class="material-symbols-outlined text-[20px]">factory</span>
            </div>
            <div>
              <div class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Delivery Destination</div>
              <div class="font-title-md text-title-md text-on-surface font-semibold">${destinationDisplay}</div>
            </div>
          </div>

          <div class="flex items-start gap-space-sm">
            <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
              <span class="material-symbols-outlined text-[20px]">local_shipping</span>
            </div>
            <div>
              <div class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Carrier Info</div>
              <div class="font-title-md text-title-md text-on-surface font-semibold">${carrierDisplay}</div>
              <div class="font-body-sm text-body-sm text-on-surface-variant mt-space-3xs">${vehicleDisplay}</div>
            </div>
          </div>
        </div>

        <div class="w-full bg-surface-container-low rounded-xl p-space-md">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-space-sm relative">
            <div class="flex sm:flex-col items-center gap-space-xs text-center flex-1">
              <div class="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-sm">
                <span class="material-symbols-outlined text-[18px]">check</span>
              </div>
              <span class="font-title-md text-title-md text-on-surface font-semibold">Order Confirmed</span>
            </div>
            <div class="hidden sm:block flex-1 h-0.5 bg-secondary"></div>
            
            <div class="flex sm:flex-col items-center gap-space-xs text-center flex-1 ${stepClassArranged}">
              <div class="w-8 h-8 rounded-full ${log.status === 'ASSIGNED' ? 'bg-primary-container text-on-primary ring-4 ring-secondary/20' : (['IN_TRANSIT', 'DELIVERED'].includes(log.status) ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant')} flex items-center justify-center shadow-sm">
                <span class="material-symbols-outlined text-[18px]">event_available</span>
              </div>
              <span class="font-title-md text-title-md text-on-surface font-semibold">Transport Logged</span>
            </div>
            <div class="hidden sm:block flex-1 h-0.5 ${log.status !== 'PENDING' ? 'bg-secondary' : 'bg-surface-container-highest'}"></div>
            
            <div class="flex sm:flex-col items-center gap-space-xs text-center flex-1 ${stepClassPickup}">
              <div class="w-8 h-8 rounded-full ${['IN_TRANSIT', 'DELIVERED'].includes(log.status) ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant'} flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">inventory_2</span>
              </div>
              <span class="font-title-md text-title-md text-on-surface font-medium">Pickup</span>
            </div>
            <div class="hidden sm:block flex-1 h-0.5 ${['IN_TRANSIT', 'DELIVERED'].includes(log.status) ? 'bg-secondary' : 'bg-surface-container-highest'}"></div>
            
            <div class="flex sm:flex-col items-center gap-space-xs text-center flex-1 ${stepClassTransit}">
              <div class="w-8 h-8 rounded-full ${log.status === 'IN_TRANSIT' ? 'bg-primary-container text-on-primary ring-4 ring-secondary/20' : (log.status === 'DELIVERED' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant')} flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">alt_route</span>
              </div>
              <span class="font-title-md text-title-md text-on-surface font-medium">In Transit</span>
            </div>
            <div class="hidden sm:block flex-1 h-0.5 ${log.status === 'DELIVERED' ? 'bg-secondary' : 'bg-surface-container-highest'}"></div>
            
            <div class="flex sm:flex-col items-center gap-space-xs text-center flex-1 ${stepClassDelivered}">
              <div class="w-8 h-8 rounded-full ${log.status === 'DELIVERED' ? 'bg-primary-container text-on-primary ring-4 ring-secondary/20' : 'bg-surface-container-highest text-on-surface-variant'} flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">task_alt</span>
              </div>
              <span class="font-title-md text-title-md text-on-surface font-medium">Delivered</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function updateLogisticsKPIs(logisticsArray) {
  const activeCount = logisticsArray.filter(l => l.status === 'IN_TRANSIT').length;
  const pickupCount = logisticsArray.filter(l => l.status === 'ASSIGNED' || l.status === 'PENDING').length;
  const deliveredCount = logisticsArray.filter(l => l.status === 'DELIVERED').length;

  const activeKPI = document.getElementById('kpi-active-deliveries');
  const pickupKPI = document.getElementById('kpi-pickup-scheduled');
  const storageKPI = document.getElementById('kpi-storage-arranged');
  const pendingKPI = document.getElementById('kpi-pending-delivery');

  if(activeKPI) activeKPI.textContent = activeCount;
  if(pickupKPI) pickupKPI.textContent = pickupCount;
  if(storageKPI) storageKPI.textContent = deliveredCount;
  // This is a basic update, if we need precise mapping we adjust as per UI text
}

// UI Interactive Handlers
window.toggleDetailDrawer = function() {
  const drawer = document.getElementById('detailAuditPanel');
  if (drawer && drawer.classList.contains('hidden')) {
    drawer.classList.remove('hidden');
    drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else if (drawer) {
    drawer.classList.add('hidden');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Interactive Tab filtering
  document.querySelectorAll('#statusTabs button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#statusTabs button').forEach(b => {
        b.className = 'px-space-md py-space-xs rounded-lg font-title-md text-title-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer';
      });
      button.className = 'px-space-md py-space-xs rounded-lg font-title-md text-title-md bg-primary-container text-on-primary font-medium transition-colors shadow-sm cursor-pointer';

      const tab = button.getAttribute('data-tab');
      const cards = document.querySelectorAll('[data-card-type]');
      cards.forEach(card => {
        if (tab === 'all') {
          card.classList.remove('hidden');
        } else if (tab === 'pickup' && (card.getAttribute('data-card-type') === 'arranged' || card.getAttribute('data-card-type') === 'transit')) {
          card.classList.remove('hidden');
        } else if (tab === 'arranged' && card.getAttribute('data-card-type') === 'arranged') {
          card.classList.remove('hidden');
        } else if (tab === 'transit' && card.getAttribute('data-card-type') === 'transit') {
          card.classList.remove('hidden');
        } else if (tab === 'delivered' && card.getAttribute('data-card-type') === 'delivered') {
          card.classList.remove('hidden');
        } else if (tab === 'storage') {
          // Scroll to storage view smoothly
          document.querySelector('h2:nth-of-type(2)')?.scrollIntoView({ behavior: 'smooth' });
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // Simple Live Search and filter handler
  const searchInput = document.getElementById('logisticsSearch');
  const cropFilter = document.getElementById('cropFilter');
  const locationFilter = document.getElementById('locationFilter');
  const resetBtn = document.getElementById('resetFilters');

  function applyFilters() {
    if (!searchInput || !cropFilter || !locationFilter) return;
    const query = searchInput.value.toLowerCase();
    const cropVal = cropFilter.value;
    const locVal = locationFilter.value;

    const cards = document.querySelectorAll('[data-card-type]');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const cardCrop = card.getAttribute('data-crop');
      const cardLoc = card.getAttribute('data-loc');

      const matchesSearch = text.includes(query);
      const matchesCrop = cropVal === 'all' || cardCrop === cropVal;
      const matchesLoc = locVal === 'all' || cardLoc === locVal;

      if (matchesSearch && matchesCrop && matchesLoc) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (cropFilter) cropFilter.addEventListener('change', applyFilters);
  if (locationFilter) locationFilter.addEventListener('change', applyFilters);

  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (cropFilter) cropFilter.value = 'all';
    if (locationFilter) locationFilter.value = 'all';
    const respFilter = document.getElementById('respFilter');
    if (respFilter) respFilter.value = 'all';
    document.querySelectorAll('[data-card-type]').forEach(card => card.classList.remove('hidden'));
  });
});
