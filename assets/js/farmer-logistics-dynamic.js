let allLogistics = [];

document.addEventListener('DOMContentLoaded', async () => {
  await fetchFarmerLogistics();
});

async function fetchFarmerLogistics() {
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
    renderFarmerLogisticsCards(allLogistics);
    updateFarmerLogisticsKPIs(allLogistics);
  } catch (err) {
    console.error('Fetch Logistics Error:', err);
  }
}

function renderFarmerLogisticsCards(logisticsArray) {
  const container = document.getElementById('activeLogisticsCardsContainer');
  if (!container) return;

  if (logisticsArray.length === 0) {
    container.innerHTML = `
      <div class="p-space-xl text-center rounded-xl bg-surface-container-lowest border border-surface-container-high border-dashed">
        <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-space-sm">local_shipping</span>
        <h3 class="font-title-md text-title-md text-on-surface font-semibold mb-space-2xs">No active logistics</h3>
        <p class="font-body-md text-body-md text-on-surface-variant">Logistics assignments will appear here once offers are accepted.</p>
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
    const buyer = txn.offer?.fromUser?.name || 'Unknown Buyer';
    
    const txnIdDisplay = `LOG-${txn.id.substring(0, 6).toUpperCase()}`;
    
    // Status formatting
    let badgeClass = 'bg-primary-fixed text-on-primary-fixed';
    let statusText = 'Transport Logged';

    if (log.status === 'PENDING') {
      badgeClass = 'bg-surface-container-high text-on-surface';
      statusText = 'Pending Transport';
    } else if (log.status === 'ASSIGNED') {
      badgeClass = 'bg-secondary-container text-on-secondary-container';
      statusText = 'Pickup Scheduled';
    } else if (log.status === 'IN_TRANSIT') {
      badgeClass = 'bg-tertiary-fixed text-on-tertiary-container';
      statusText = 'In Transit';
    } else if (log.status === 'DELIVERED') {
      badgeClass = 'bg-surface-container text-on-surface';
      statusText = 'Delivered';
    }

    html += `
      <div class="p-space-sm rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div class="flex flex-col gap-1 min-w-0">
          <div class="flex items-center gap-space-xs flex-wrap">
            <span class="font-metric-mono text-metric-mono font-bold text-primary">${txnIdDisplay}</span>
            <span class="px-space-xs py-space-3xs rounded-full ${badgeClass} font-label-sm text-label-sm font-semibold text-[11px]">${statusText}</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant font-semibold">${crop} (${quantity} Qtl)</span>
          </div>
          <div class="flex items-center gap-space-md text-body-sm text-on-surface-variant flex-wrap text-[13px]">
            <span class="">Origin: <strong class="text-primary font-medium">${log.origin || 'N/A'}</strong></span>
            <span class="">•</span>
            <span class="">Buyer: <strong class="text-primary font-medium">${buyer}</strong></span>
            <span class="">•</span>
            <span class="">Carrier: <strong class="text-primary font-medium">${log.carrierName || 'TBD'} (${log.vehicleNumber || 'TBD'})</strong></span>
          </div>
        </div>
        <div class="flex items-center gap-space-sm shrink-0 justify-between md:justify-end">
          <div class="text-right hidden sm:block">
            <span class="font-label-sm text-label-sm text-on-surface-variant block text-[11px] uppercase">${log.status === 'ASSIGNED' ? 'Carrier Slot' : 'Est. Arrival'}</span>
            <span class="font-label-md text-label-md font-bold text-primary">${log.status === 'ASSIGNED' ? 'Pending' : 'In Transit'}</span>
          </div>
          <button class="px-space-sm py-1.5 rounded-lg bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold hover:bg-surface-container transition-colors" onclick="showToast('Viewing detailed manifests for ${txnIdDisplay}', 'info');">
            Manifest
          </button>
          <button class="px-space-sm py-1.5 rounded-lg bg-primary-container text-white font-label-sm text-label-sm font-semibold hover:bg-primary transition-colors shadow-sm flex items-center gap-1" onclick="showToast('Tracking shipment ${txnIdDisplay} live', 'info');">
            <span class="material-symbols-outlined text-[14px]">my_location</span>Track
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function updateFarmerLogisticsKPIs(logisticsArray) {
  const activeCount = logisticsArray.length;
  const pickupCount = logisticsArray.filter(l => l.status === 'ASSIGNED' || l.status === 'PENDING').length;
  const transitCount = logisticsArray.filter(l => l.status === 'IN_TRANSIT').length;

  const activeKPI = document.getElementById('kpi-active-logistics');
  const pickupKPI = document.getElementById('kpi-upcoming-pickups');
  const transitKPI = document.getElementById('kpi-in-transit');

  if(activeKPI) activeKPI.textContent = activeCount;
  if(pickupKPI) pickupKPI.textContent = pickupCount;
  if(transitKPI) transitKPI.textContent = transitCount;

  // Update dispatch count badge
  const dispatchBadge = document.getElementById('kpi-dispatch-count');
  if (dispatchBadge) dispatchBadge.textContent = `${activeCount} Active Record${activeCount !== 1 ? 's' : ''}`;

  // Populate tracking section with the first active logistics record
  if (logisticsArray.length > 0) {
    const log = logisticsArray[0];
    const txn = log.transaction || {};
    const lot = txn.lot || {};
    const crop = lot.commodity?.name || 'Unknown Produce';
    const quantity = txn.offer?.quantity || 0;
    const buyer = txn.offer?.fromUser?.buyerProfile?.companyName || txn.offer?.fromUser?.name || 'Unknown Buyer';

    const lotDetails = document.getElementById('tracking-lot-details');
    if (lotDetails) lotDetails.textContent = `${crop} (${quantity} Quintals) • ${buyer}`;
    
    const lotStatus = document.getElementById('tracking-lot-status');
    if (lotStatus) {
      if (log.status === 'PENDING') lotStatus.textContent = 'PENDING';
      else if (log.status === 'ASSIGNED') lotStatus.textContent = 'SCHEDULED';
      else if (log.status === 'IN_TRANSIT') lotStatus.textContent = 'IN TRANSIT';
      else if (log.status === 'DELIVERED') lotStatus.textContent = 'DELIVERED';
      else lotStatus.textContent = log.status || 'UNKNOWN';
    }
    const lotRef = document.getElementById('tracking-lot-ref');
    if (lotRef) lotRef.textContent = `Ref: #LOG-${txn.id.substring(0, 6).toUpperCase()}`;

    // Timeline helpers
    const formatDate = (dateStr) => {
      if (!dateStr) return 'Not available';
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    };
    const formatOnlyDate = (dateStr) => {
      if (!dateStr) return 'Not available';
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const formatOnlyTime = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const createdEl = document.getElementById('tracking-created-date');
    if (createdEl) createdEl.textContent = formatDate(txn.createdAt);
    
    const scheduledEl = document.getElementById('tracking-scheduled-date');
    const arrangedEl = document.getElementById('tracking-arranged-date');
    const transitEl = document.getElementById('tracking-transit-date');
    const deliveredEl = document.getElementById('tracking-delivered-date');

    if (log.status === 'ASSIGNED' || log.status === 'IN_TRANSIT' || log.status === 'DELIVERED') {
      if (scheduledEl) scheduledEl.textContent = 'Confirmed';
      if (arrangedEl) arrangedEl.textContent = 'Confirmed';
    }
    if (log.status === 'IN_TRANSIT' || log.status === 'DELIVERED') {
      if (transitEl) transitEl.textContent = 'Confirmed';
    }
    if (log.status === 'DELIVERED') {
      if (deliveredEl) deliveredEl.textContent = formatDate(log.deliveryDate) || 'Confirmed';
    }

    const setActiveNode = (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center font-label-sm text-label-sm font-bold shadow-sm';
        el.innerHTML = '<span class="material-symbols-outlined text-[14px]">check</span>';
      }
    };
    if (log.status !== 'PENDING') {
      setActiveNode('icon-scheduled');
      setActiveNode('icon-arranged');
    }
    if (log.status === 'IN_TRANSIT' || log.status === 'DELIVERED') {
      setActiveNode('icon-intransit');
    }
    if (log.status === 'DELIVERED') {
      setActiveNode('icon-delivered');
    }

    // Grid properties
    const pickupDateEl = document.getElementById('tracking-pickup-date');
    if (pickupDateEl) pickupDateEl.textContent = formatOnlyDate(log.pickupDate);
    const pickupTimeEl = document.getElementById('tracking-pickup-time');
    if (pickupTimeEl) pickupTimeEl.textContent = formatOnlyTime(log.pickupDate);

    const deliveryDateEl = document.getElementById('tracking-delivery-date');
    if (deliveryDateEl) deliveryDateEl.textContent = formatOnlyDate(log.deliveryDate);
    const deliveryTimeEl = document.getElementById('tracking-delivery-time');
    if (deliveryTimeEl) deliveryTimeEl.textContent = formatOnlyTime(log.deliveryDate);

    const dest = document.getElementById('tracking-destination');
    if (dest) dest.textContent = log.destination || 'Not available';
    const destDetail = document.getElementById('tracking-destination-detail');
    if (destDetail) destDetail.textContent = log.destination ? buyer : '';

    const driverName = document.getElementById('tracking-driver-name');
    if (driverName) driverName.textContent = log.driverName || 'Not available';
    const vehicle = document.getElementById('tracking-vehicle');
    if (vehicle) vehicle.textContent = log.carrierName ? `${log.carrierName} (${log.vehicleNumber || 'N/A'})` : '';
  }
}
