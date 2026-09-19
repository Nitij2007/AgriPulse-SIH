document.addEventListener('DOMContentLoaded', async () => {
    const token = sessionStorage.getItem('token');
    
    // Target the Buyer Interest container (Section 6)
    const buyerInterestContainer = document.getElementById('lots-container');
    
    // Find all hardcoded lot cards in Section 4
    const hardcodedCards = document.querySelectorAll('.lot-item-card');
    
    if (!token) {
        // Remove hardcoded sample cards
        hardcodedCards.forEach(c => c.remove());
        if (buyerInterestContainer) {
            buyerInterestContainer.innerHTML = '<div class="col-span-full p-space-xl text-center bg-surface-container-low rounded-xl"><span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">inventory_2</span><h3 class="text-title-lg font-semibold text-primary mb-1">Please Log In</h3><p class="text-body-md text-on-surface-variant">Login via the <a href="../farmer-login.html" class="text-secondary font-semibold hover:underline">Farmer Login</a> to see your lots.</p></div>';
        }
        return;
    }
    
    try {
        const res = await fetch('/api/lots', {
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

        
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        
        const lots = data.lots || [];

        // Remove the hardcoded sample cards
        hardcodedCards.forEach(c => c.remove());
        
        // Find the Section 4 container to inject dynamic cards
        // It's the parent of the hardcoded lot cards - a div.flex.flex-col.gap-space-lg
        // We'll find it by looking for the "Active Lots in Trade" header
        const section4Headers = document.querySelectorAll('h2');
        let section4Container = null;
        section4Headers.forEach(h => {
            if (h.textContent.includes('Active Lots in Trade')) {
                section4Container = h.closest('.flex.flex-col.gap-space-lg');
            }
        });

        if (lots.length === 0) {
            // Show empty state
            if (section4Container) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'p-space-xl text-center bg-surface-container-low rounded-xl';
                emptyDiv.innerHTML = '<span class="material-symbols-outlined text-4xl text-on-surface-variant" style="display:block;margin-bottom:8px;">inventory_2</span><h3 class="font-title-lg text-title-lg font-semibold text-primary mb-1">No produce lots yet</h3><p class="font-body-md text-body-md text-on-surface-variant">Create your first lot to start connecting with buyers.</p><a href="create-lot.html" class="inline-flex items-center gap-1 mt-4 px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary font-label-md font-semibold hover:bg-secondary transition-all"><span class="material-symbols-outlined text-[18px]">add_circle</span> Create New Lot</a>';
                section4Container.appendChild(emptyDiv);
            }
            if (buyerInterestContainer) {
                buyerInterestContainer.innerHTML = '<div class="col-span-full p-space-md text-center bg-surface-container-low rounded-xl"><p class="text-body-md text-on-surface-variant">No buyer interest yet. Create a lot first.</p></div>';
            }
        } else {
            // Render dynamic lot cards in Section 4 matching Stitch design language
            if (section4Container) {
                // Update the "X Shown" label
                const shownLabel = section4Container.querySelector('.font-label-sm.rounded-md');
                if (shownLabel) shownLabel.textContent = `${lots.length} Shown`;
                
                lots.forEach(lot => {
                    const card = document.createElement('div');
                    card.className = 'lot-item-card flex flex-col lg:flex-row items-stretch justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all gap-space-lg';
                    card.dataset.status = lot.status.toLowerCase();
                    
                    const statusColors = {
                        'LISTED': { bg: 'bg-secondary-container', text: 'text-on-secondary-container', dot: 'bg-secondary' },
                        'MATCHED': { bg: 'bg-tertiary-fixed', text: 'text-tertiary', dot: 'bg-on-tertiary-container' },
                        'SOLD': { bg: 'bg-primary-container', text: 'text-primary-fixed', dot: 'bg-primary-fixed' },
                        'EXPIRED': { bg: 'bg-surface-container', text: 'text-on-surface-variant', dot: 'bg-outline' }
                    };
                    const sc = statusColors[lot.status] || statusColors['LISTED'];
                    const cropName = lot.commodity ? lot.commodity.name : 'Produce';
                    const createdDate = new Date(lot.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    
                    card.innerHTML = `
                    <div class="flex flex-col sm:flex-row gap-space-md flex-1">
                        <div class="w-full sm:w-48 h-36 rounded-lg bg-surface-container-low flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary text-[48px]">eco</span>
                            <div class="absolute top-2 left-2 px-space-xs py-space-3xs rounded bg-surface-container-lowest/90 backdrop-blur font-label-sm text-label-sm font-semibold text-primary">#${lot.id.substring(0,8).toUpperCase()}</div>
                        </div>
                        <div class="flex flex-col justify-between flex-1 gap-space-xs min-w-0">
                            <div>
                                <div class="flex flex-wrap items-center gap-space-xs mb-space-2xs">
                                    <span class="px-space-xs py-space-3xs rounded-full ${sc.bg} ${sc.text} font-label-sm text-label-sm font-semibold flex items-center gap-1">
                                        <span class="w-1.5 h-1.5 rounded-full ${sc.dot}"></span>${lot.status}
                                    </span>
                                    <span class="px-space-xs py-space-3xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">${lot.grade || 'Standard'}</span>
                                    <span class="font-label-sm text-label-sm text-on-surface-variant">Listed: ${createdDate}</span>
                                </div>
                                <h3 class="font-title-lg text-title-lg text-primary font-bold truncate">${cropName}</h3>
                                <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Moisture ${lot.moisturePct || 'N/A'}% • ${lot.quantity} ${lot.unit}</p>
                            </div>
                            <div class="flex flex-wrap items-center gap-space-md pt-space-xs text-on-surface-variant font-label-md text-label-md">
                                <div class="flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[18px] text-secondary">warehouse</span>
                                    <span>${lot.location || 'Farm Gate'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-row lg:flex-col justify-between lg:justify-center items-end gap-space-sm pl-0 lg:pl-space-lg lg:border-l lg:border-surface-container min-w-[240px]">
                        <div class="flex flex-col lg:items-end text-left lg:text-right">
                            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Listing Price</span>
                            <div class="flex items-baseline gap-1">
                                <span class="font-headline-md text-headline-md font-bold text-primary">₹${(lot.listingPrice || 0).toLocaleString('en-IN')}</span>
                                <span class="font-label-sm text-label-sm text-on-surface-variant">/ ${lot.unit}</span>
                            </div>
                            <span class="font-label-md text-label-md font-semibold text-primary mt-1">${lot.quantity} ${lot.unit} Total</span>
                        </div>
                        <div class="flex items-center gap-space-xs">
                            <button class="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-secondary transition-colors" type="button">Manage Lot</button>
                        </div>
                    </div>`;
                    
                    section4Container.appendChild(card);
                });
            }
            
            // Populate buyer interest container
            if (buyerInterestContainer) {
                buyerInterestContainer.innerHTML = lots.map(lot => `
                    <div class="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden hover:shadow-md transition-shadow">
                        <div class="p-space-md flex flex-col gap-space-sm">
                            <div class="flex justify-between items-start">
                                <div>
                                    <span class="text-label-sm font-semibold text-secondary px-2 py-0.5 bg-secondary-container rounded-full uppercase">${lot.status}</span>
                                    <h3 class="text-title-md font-bold text-primary mt-2">${lot.commodity ? lot.commodity.name : 'Crop'}</h3>
                                </div>
                                <span class="text-title-lg font-bold text-primary">₹${(lot.listingPrice || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div class="flex items-center gap-space-md text-body-sm text-on-surface-variant mt-2">
                                <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">scale</span> ${lot.quantity} ${lot.unit}</div>
                                <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">water_drop</span> ${lot.moisturePct || 'N/A'}% Moisture</div>
                            </div>
                            <div class="flex items-center gap-1 text-body-sm text-on-surface-variant mt-2 border-t border-outline-variant pt-2">
                                <span class="material-symbols-outlined text-[16px]">location_on</span> ${lot.location || 'Farm Gate'}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Update stats strip with real counts
        const activeLots = lots.filter(l => l.status === 'LISTED');
        const underOfferLots = lots.filter(l => l.status === 'MATCHED');
        const soldLots = lots.filter(l => l.status === 'SOLD');
        const completedLots = lots.filter(l => l.status === 'COMPLETED' || l.status === 'SETTLED');
        const totalLots = lots.length;
        const totalQty = lots.reduce((sum, l) => sum + (l.quantity || 0), 0);
        
        const statCards = document.querySelectorAll('.font-display-lg.text-headline-lg.text-primary.font-bold');
        if (statCards.length >= 4) {
            statCards[0].textContent = activeLots.length;
            statCards[1].textContent = Math.round(totalQty);
            statCards[2].textContent = "0"; // No matching API currently
            statCards[3].textContent = "0"; // No offers API currently
        } else if (statCards.length >= 2) {
            statCards[0].textContent = activeLots.length;
            statCards[1].textContent = Math.round(totalQty);
        }

        // Update header badge
        const headerBadge = document.getElementById('header-active-lots-badge');
        if (headerBadge) {
            headerBadge.textContent = activeLots.length + ' Active Lots In Trade';
        }

        // Update portfolio distribution text
        const portfolioText = document.getElementById('portfolio-distribution-text');
        if (portfolioText) {
            portfolioText.textContent = `Live distribution of ${totalLots} registered produce lots across trade cycles`;
        }

        // Update filter pills
        const pills = document.querySelectorAll('.filter-pill');
        pills.forEach(pill => {
            const text = pill.textContent.trim();
            if (text.startsWith('All')) pill.textContent = 'All (' + totalLots + ')';
            else if (text.startsWith('Active')) pill.textContent = 'Active (' + activeLots.length + ')';
            else if (text.startsWith('Under Offer')) pill.textContent = 'Under Offer (' + underOfferLots.length + ')';
            else if (text.startsWith('Sold')) pill.textContent = 'Sold (' + soldLots.length + ')';
            else if (text.startsWith('Completed')) pill.textContent = 'Completed (' + completedLots.length + ')';
        });

        // Update portfolio values
        const computeValue = (arr) => arr.reduce((sum, l) => sum + ((l.listingPrice || 0) * (l.quantity || 0)), 0);
        const activeVal = computeValue(activeLots);
        const offerVal = computeValue(underOfferLots);
        const soldVal = computeValue(soldLots);
        const completedVal = computeValue(completedLots);
        const totalVal = activeVal + offerVal + soldVal + completedVal || 1;

        // Fetch API for offers and buyer matching
        try {
            const [offersRes, buyersRes] = await Promise.all([
                fetch('/api/offers', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/matching/buyers', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (offersRes.ok && statCards.length >= 4) {
                const offersData = await offersRes.json();
                if (offersData.offers) {
                    statCards[3].textContent = offersData.offers.length;
                }
            }
            if (buyersRes.ok && statCards.length >= 4) {
                const buyersData = await buyersRes.json();
                if (buyersData.requirements) {
                    const matchCount = buyersData.requirements.length;
                    statCards[2].textContent = matchCount;
                    const subtext = statCards[2].closest('.flex-col').querySelector('.text-on-surface-variant:last-child');
                    if (subtext) {
                        subtext.textContent = matchCount === 0 ? 'No active buyer matches' : 'Active matching buyers';
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching offers or buyers:', e);
        }

        // Update portfolio breakdown monetary values
        const portfolioValues = document.querySelectorAll('.font-metric-mono.font-medium.text-primary');
        if (portfolioValues.length >= 4) {
            portfolioValues[0].textContent = '₹' + activeVal.toLocaleString('en-IN');
            portfolioValues[1].textContent = '₹' + offerVal.toLocaleString('en-IN');
            portfolioValues[2].textContent = '₹' + soldVal.toLocaleString('en-IN');
            portfolioValues[3].textContent = '₹' + completedVal.toLocaleString('en-IN');
        }

        // Update portfolio bar percentages
        let activePct = 0, offerPct = 0, soldPct = 0, completedPct = 0;
        if (totalLots > 0) {
            activePct = Math.round((activeLots.length / totalLots) * 100);
            offerPct = Math.round((underOfferLots.length / totalLots) * 100);
            soldPct = Math.round((soldLots.length / totalLots) * 100);
            completedPct = Math.max(0, 100 - activePct - offerPct - soldPct);
        }
        
        const legActive = document.getElementById('portfolio-legend-active');
        if (legActive) legActive.textContent = `Active (${activePct}%)`;
        const legOffer = document.getElementById('portfolio-legend-offer');
        if (legOffer) legOffer.textContent = `Under Offer (${offerPct}%)`;
        const legSold = document.getElementById('portfolio-legend-sold');
        if (legSold) legSold.textContent = `Sold (${soldPct}%)`;
        const legComp = document.getElementById('portfolio-legend-completed');
        if (legComp) legComp.textContent = `Settled (${completedPct}%)`;

        const barSegments = document.querySelectorAll('.h-full[style*="width"]');
        if (barSegments.length >= 4) {
            barSegments[0].style.width = activePct + '%';
            barSegments[0].title = 'Active: ' + activeLots.length + ' Lots (' + activePct + '%)';
            barSegments[1].style.width = offerPct + '%';
            barSegments[1].title = 'Under Offer: ' + underOfferLots.length + ' Lots (' + offerPct + '%)';
            barSegments[2].style.width = soldPct + '%';
            barSegments[2].title = 'Sold: ' + soldLots.length + ' Lots (' + soldPct + '%)';
            barSegments[3].style.width = completedPct + '%';
            barSegments[3].title = 'Completed: ' + completedLots.length + ' Lots (' + completedPct + '%)';
        }

        // Update lot count labels in portfolio section
        const lotCountLabels = document.querySelectorAll('.font-headline-sm.text-headline-sm.text-primary.font-bold');
        if (lotCountLabels.length >= 4) {
            lotCountLabels[0].textContent = activeLots.length + ' Lots';
            lotCountLabels[1].textContent = underOfferLots.length + ' Lots';
            lotCountLabels[2].textContent = soldLots.length + ' Lots';
            lotCountLabels[3].textContent = completedLots.length + ' Lots';
        }

    } catch (err) {
        console.error('Error fetching lots:', err);
        hardcodedCards.forEach(c => c.remove());
        if (buyerInterestContainer) {
            buyerInterestContainer.innerHTML = '<p class="text-error p-space-md">Failed to load lots from server.</p>';
        }
    }
});
