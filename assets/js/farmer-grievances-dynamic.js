async function fetchGrievances() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('/api/grievances', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      const grievances = data.grievances || [];
      allGrievances = grievances;
      renderGrievances(grievances);
      updateGrievanceKPIs(grievances);
    }
  } catch (error) {
    console.error('Failed to fetch grievances', error);
  }
}

function updateGrievanceKPIs(grievances) {
  const total = grievances.length;
  const countEl = document.getElementById('grievance-record-count');
  if (countEl) countEl.textContent = `Showing ${total} Record${total === 1 ? '' : 's'}`;
  const open = grievances.filter(g => g.status === 'OPEN').length;
  const review = grievances.filter(g => g.status === 'UNDER_REVIEW').length;
  const resolved = grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length;

  const totalEl = document.getElementById('kpi-total-grievances');
  if (totalEl) totalEl.textContent = total;

  const openEl = document.getElementById('kpi-open-grievances');
  if (openEl) openEl.textContent = open;

  const reviewEl = document.getElementById('kpi-review-grievances');
  if (reviewEl) reviewEl.textContent = review;

  const resolvedEl = document.getElementById('kpi-resolved-grievances');
  if (resolvedEl) resolvedEl.textContent = resolved;
}

function renderGrievances(grievances) {
  const tbody = document.getElementById('grievancesTableBody');
  if (!tbody) return;

  if (grievances.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-on-surface-variant">No grievances found</td></tr>`;
    return;
  }

  let html = '';
  grievances.forEach(grv => {
    const grvId = `GRV-${grv.id.substring(0, 6).toUpperCase()}`;
    const txn = grv.transaction || {};
    const txnId = txn.id ? `TXN-${txn.id.substring(0, 6).toUpperCase()}` : 'N/A';
    const lot = txn.lot || {};
    const commodity = lot.commodity || { name: 'Unknown' };
    const localTxn = allFarmerTxns.find(t => t.id === txn.id);
    const buyerName = localTxn?.offer?.fromUser?.buyerProfile?.companyName || localTxn?.offer?.fromUser?.name || txn.offer?.fromUser?.name || 'Unknown Buyer';
    const date = new Date(grv.createdAt).toLocaleDateString('en-IN');
    const updateDate = grv.updatedAt ? new Date(grv.updatedAt).toLocaleDateString('en-IN') : 'Not available';
    
    let statusHtml = '';
    switch(grv.status) {
      case 'OPEN':
        statusHtml = `<span class="px-space-xs py-space-3xs rounded-full bg-tertiary-fixed text-on-tertiary-container font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs"><span class="material-symbols-outlined text-[14px]">schedule</span>Open</span>`;
        break;
      case 'UNDER_REVIEW':
        statusHtml = `<span class="px-space-xs py-space-3xs rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs"><span class="material-symbols-outlined text-[14px]">pending</span>Under Review</span>`;
        break;
      case 'RESOLVED':
        statusHtml = `<span class="px-space-xs py-space-3xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs"><span class="material-symbols-outlined text-[14px]">check_circle</span>Resolved</span>`;
        break;
      case 'CLOSED':
        statusHtml = `<span class="px-space-xs py-space-3xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs"><span class="material-symbols-outlined text-[14px]">lock</span>Closed</span>`;
        break;
      default:
        statusHtml = `<span class="px-space-xs py-space-3xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold inline-flex items-center gap-space-3xs">${grv.status}</span>`;
    }

    html += `
      <tr class="hover:bg-surface-container-low transition-colors">
        <td class="py-space-xs px-space-xs font-metric-mono font-bold text-primary whitespace-nowrap">${grvId}</td>
        <td class="py-space-xs px-space-xs font-semibold text-primary whitespace-nowrap">${grv.type || grv.category || 'Issue'}</td>
        <td class="py-space-xs px-space-xs text-on-surface text-body-sm">${commodity.name}</td>
        <td class="py-space-xs px-space-xs font-metric-mono text-on-surface-variant whitespace-nowrap">${txnId}</td>
        <td class="py-space-xs px-space-xs font-semibold text-primary text-body-sm">${buyerName}</td>
        <td class="py-space-xs px-space-xs text-on-surface-variant whitespace-nowrap">${date}</td>
        <td class="py-space-xs px-space-xs text-on-surface-variant whitespace-nowrap">${updateDate}</td>
        <td class="py-space-xs px-space-xs whitespace-nowrap">${statusHtml}</td>
        <td class="py-space-xs px-space-xs text-right whitespace-nowrap">
          <button class="px-space-xs py-space-3xs rounded bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold hover:bg-surface-container transition-colors" onclick="viewGrievanceDetails(\'${grv.id}\')">View Details</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchFormDependencies();
  await fetchGrievances();
});


let allFarmerTxns = [];
let allGrievances = [];

async function fetchFormDependencies() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const resTxn = await fetch('/api/transactions/farmer', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resTxn.ok) {
      const dataTxn = await resTxn.json();
      allFarmerTxns = dataTxn.transactions || [];
      const txnSelect = document.getElementById('transactionId');
      if (txnSelect) {
        txnSelect.innerHTML = '<option value="">Select a recent transaction...</option>' + 
          allFarmerTxns.map(t => {
            const lotName = t.lot?.commodity?.name || 'Unknown Lot';
            return `<option value="${t.id}">#TXN-${t.id.substring(0,6).toUpperCase()} - ${lotName}</option>`;
          }).join('');
      }
    }

    const resLot = await fetch('/api/lots', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const lotSelect = document.getElementById('relatedLotSelect');
    if (resLot.ok && lotSelect) {
      const dataLot = await resLot.json();
      const allFarmerLots = dataLot.lots || [];
      if (allFarmerLots.length > 0) {
        lotSelect.innerHTML = '<option value="">Select a lot...</option>' + 
          allFarmerLots.map(l => {
            const lotName = l.commodity?.name || 'Unknown Produce';
            return `<option value="${l.id}">#LOT-${l.id.substring(0,6).toUpperCase()} - ${lotName}</option>`;
          }).join('');
      } else {
        lotSelect.innerHTML = '<option value="">No lots available</option>';
      }
    } else if (lotSelect) {
      lotSelect.innerHTML = '<option value="">No lots available</option>';
    }
  } catch (err) {
    console.error('Failed to fetch dependencies for form', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const txnSelect = document.getElementById('transactionId');
  if (txnSelect) {
    txnSelect.addEventListener('change', (e) => {
      const txnId = e.target.value;
      const txn = allFarmerTxns.find(t => t.id === txnId);
      const buyerSpan = document.getElementById('form-buyer-name');
      const lotSelect = document.getElementById('relatedLotSelect');
      
      if (txn) {
        if (buyerSpan) buyerSpan.textContent = txn.offer?.fromUser?.buyerProfile?.companyName || txn.offer?.fromUser?.name || 'Unknown Buyer';
        if (lotSelect && txn.lot?.id) {
          lotSelect.value = txn.lot.id;
        }
      } else {
        if (buyerSpan) buyerSpan.textContent = 'Select a transaction...';
      }
    });
  }

  const grievanceForm = document.getElementById('createGrievanceForm');
  if (grievanceForm) {
    grievanceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const transactionId = document.getElementById('transactionId').value;
      const category = document.getElementById('grievance-category').value;
      const subject = document.getElementById('grievance-subject').value;
      const desc = document.getElementById('grievance-description').value;
      const resolution = document.getElementById('grievance-resolution').value;

      if (!transactionId) {
        if (typeof showToast === 'function') showToast('Please select a transaction.', 'error');
        return;
      }

      // Combine subject and description as the backend only takes type and description
      const fullDescription = `Subject: ${subject}\n\nDescription: ${desc}\n\nPreferred Resolution: ${resolution}`;

      try {
        const res = await fetch('/api/grievances', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            transactionId: transactionId,
            type: category,
            description: fullDescription
          })
        });
        
        if (res.ok) {
          if (typeof showToast === 'function') showToast('Grievance submitted successfully.', 'success');
          grievanceForm.reset();
          const buyerSpan = document.getElementById('form-buyer-name');
          if (buyerSpan) buyerSpan.textContent = 'Select a transaction...';
          const lotSelect = document.getElementById('relatedLotSelect');
          if (lotSelect) lotSelect.innerHTML = '<option value="">Select a transaction first...</option>';
          fetchGrievances();
        } else {
          const data = await res.json();
          if (typeof showToast === 'function') showToast(data.error || 'Failed to submit grievance.', 'error');
        }
      } catch (err) {
        console.error('Submit Grievance Error:', err);
        if (typeof showToast === 'function') showToast('An error occurred.', 'error');
      }
    });
  }
});


window.viewGrievanceDetails = function(id) {
  const grv = allGrievances.find(g => g.id === id);
  if (!grv) return;

  const panel = document.getElementById('grievanceDetailsPanel');
  if (!panel) return;

  const grvId = `GRV-${grv.id.substring(0, 6).toUpperCase()}`;
  const txn = grv.transaction || {};
  const txnId = txn.id ? `TXN-${txn.id.substring(0, 6).toUpperCase()}` : 'Not available';
  const lot = txn.lot || {};
  const commodity = lot.commodity || { name: 'Not available' };
  const quantity = lot.quantity ? `${lot.quantity} ${lot.unit || ''}` : 'Not available';
  
  const localTxn = allFarmerTxns.find(t => t.id === txn.id);
  const buyerName = localTxn?.offer?.fromUser?.buyerProfile?.companyName || localTxn?.offer?.fromUser?.name || txn.offer?.fromUser?.name || 'Not available';
  
  const date = new Date(grv.createdAt).toLocaleDateString('en-IN');
  const updateDate = grv.updatedAt ? new Date(grv.updatedAt).toLocaleDateString('en-IN') : 'Not available';

  const type = grv.type || grv.category || 'Not available';
  const status = grv.status || 'Not available';
  const desc = grv.description || 'Not available';
  const resolution = grv.resolution || 'Not available';

  panel.innerHTML = `
    <div class="flex items-center justify-between border-b border-surface-container pb-space-sm">
      <div>
        <h3 class="font-title-lg text-title-lg text-primary font-bold">Grievance Details</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant">Reference: ${grvId}</p>
      </div>
      <button class="text-on-surface-variant hover:text-primary transition-colors" onclick="document.getElementById('grievanceDetailsPanel').classList.add('hidden')">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md font-body-md text-body-md text-on-surface">
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Category</span>
        <span class="font-semibold text-primary">${type}</span>
      </div>
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Status</span>
        <span class="font-semibold text-primary">${status}</span>
      </div>
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Related Lot</span>
        <span>${commodity.name}</span>
      </div>
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Quantity</span>
        <span>${quantity}</span>
      </div>
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Transaction ID</span>
        <span>${txnId}</span>
      </div>
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Buyer</span>
        <span>${buyerName}</span>
      </div>
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Submitted Date</span>
        <span>${date}</span>
      </div>
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Updated Date</span>
        <span>${updateDate}</span>
      </div>
    </div>
    <div class="border-t border-surface-container pt-space-sm mt-space-sm">
      <div class="flex flex-col gap-space-2xs mb-space-sm">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Subject / Description</span>
        <p class="whitespace-pre-wrap">${desc}</p>
      </div>
      <div class="flex flex-col gap-space-2xs">
        <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase">Preferred Resolution / Expected Action</span>
        <p class="whitespace-pre-wrap">${resolution}</p>
      </div>
    </div>
  `;
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth' });
};
