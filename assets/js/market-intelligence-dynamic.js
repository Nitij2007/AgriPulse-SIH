document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    window.location.href = '../farmer-login.html';
    return;
  }

  const fetchApi = async (url) => {
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      return { error: err.error || 'Failed' };
    } catch (e) {
      console.error(e);
      return { error: 'Network error' };
    }
  };

  const loadMarketData = async (commodity) => {
    const pricesContainer = document.getElementById('mi-prices-container');
    const insightContainer = document.getElementById('mi-insight-container');
    
    if (!commodity) {
      renderExploreProduce();
      return;
    }
    
    const meRes = await fetchApi('/api/auth/me');
    if (!meRes || !meRes.user || !meRes.user.farmerProfile) return;
    
    const state = meRes.user.farmerProfile.state;
    const city = meRes.user.farmerProfile.city;
    
    if (!state || !city) {
      if (pricesContainer) pricesContainer.innerHTML = '<p class="text-secondary font-medium">Location not set. Please update your profile.</p>';
      if (insightContainer) insightContainer.innerHTML = '<p class="text-secondary font-medium">No insights available.</p>';
      return;
    }
    
    if (pricesContainer) pricesContainer.innerHTML = '<p class="text-on-surface-variant text-sm">Fetching live data...</p>';
    if (insightContainer) insightContainer.innerHTML = '<p class="text-on-surface-variant text-sm">Calculating insights...</p>';
    
    let url = `/api/market-prices?state=${encodeURIComponent(state)}&district=${encodeURIComponent(city)}&commodity=${encodeURIComponent(commodity)}`;
    let mandiRes = await fetchApi(url);
    
    const isFallback = mandiRes && mandiRes.isFallback;
    
    if (mandiRes && !mandiRes.error && mandiRes.markets && mandiRes.markets.length > 0) {
      let html = '';
      let latestDate = mandiRes.markets[0]?.priceDate || 'Unknown Date';
      if (isFallback) {
        html += `<div class="mb-space-sm p-space-xs rounded bg-surface-container text-[12px] font-medium text-on-surface-variant flex flex-col gap-space-3xs">
          <div class="flex items-center gap-space-2xs">
            <span class="material-symbols-outlined text-[16px]">info</span>
            Showing State-wide Government Mandi Data for ${state}
          </div>
          <div class="text-emerald-700 font-semibold pl-[22px]">Latest available market data: ${latestDate}</div>
        </div>`;
      } else {
        html += `<div class="mb-space-sm p-space-xs rounded bg-surface-container text-[12px] font-medium text-on-surface-variant flex items-center gap-space-2xs">
          <span class="material-symbols-outlined text-[16px]">event</span>
          <span class="text-emerald-700 font-semibold">Latest available market data: ${latestDate}</span>
        </div>`;
      }
      
      let maxPrice = 0;
      let minPrice = Infinity;
      let bestMarket = '';
      let lowestMarket = '';
      
      mandiRes.markets.forEach(m => {
        const modal = parseFloat(m.modalPrice);
        if (modal > maxPrice) {
          maxPrice = modal;
          bestMarket = m.market;
        }
        if (modal < minPrice) {
          minPrice = modal;
          lowestMarket = m.market;
        }
        
        html += `
          <div class="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low border border-emerald-900/5 hover:border-emerald-200 transition-colors mb-space-2xs">
            <div class="flex items-center gap-space-sm">
              <div class="p-space-2xs bg-white rounded-md text-secondary shadow-sm">
                <span class="material-symbols-outlined text-[18px]">storefront</span>
              </div>
              <div>
                <div class="font-title-md text-title-md text-primary font-semibold">${m.market}</div>
                <div class="text-[11px] text-on-surface-variant font-medium">${m.variety} • ${m.priceDate}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-metric-mono font-bold text-secondary text-[15px]">₹${m.modalPrice}</div>
              <div class="text-[10px] text-on-surface-variant font-medium">₹${m.minPrice} - ₹${m.maxPrice}</div>
            </div>
          </div>
        `;
      });
      if (pricesContainer) pricesContainer.innerHTML = html;
      
      let diff = maxPrice - minPrice;
      let insightHtml = `
        <div class="p-space-md rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col gap-space-xs">
          <div class="flex items-center gap-space-2xs mb-space-2xs">
            <span class="material-symbols-outlined text-secondary text-[18px]">analytics</span>
            <span class="font-label-md text-label-md font-bold text-primary">AgriPulse Market Insight</span>
          </div>
          <div class="flex flex-col gap-space-2xs">
            <div class="flex justify-between items-center bg-white p-space-xs rounded border border-emerald-900/5">
              <span class="text-[12px] text-on-surface-variant font-medium">Highest Modal Price</span>
              <span class="text-[13px] text-primary font-bold">₹${maxPrice} <span class="text-[11px] font-medium text-on-surface-variant">(${bestMarket})</span></span>
            </div>
            <div class="flex justify-between items-center bg-white p-space-xs rounded border border-emerald-900/5">
              <span class="text-[12px] text-on-surface-variant font-medium">Lowest Modal Price</span>
              <span class="text-[13px] text-primary font-bold">₹${minPrice} <span class="text-[11px] font-medium text-on-surface-variant">(${lowestMarket})</span></span>
            </div>
            <div class="flex justify-between items-center bg-white p-space-xs rounded border border-emerald-900/5">
              <span class="text-[12px] text-on-surface-variant font-medium">Price Difference</span>
              <span class="text-[13px] text-secondary font-bold">₹${diff.toFixed(2)}</span>
            </div>
            <div class="flex justify-between items-center bg-white p-space-xs rounded border border-emerald-900/5">
              <span class="text-[12px] text-on-surface-variant font-medium">Active Market Records</span>
              <span class="text-[13px] text-primary font-bold">${mandiRes.markets.length}</span>
            </div>
          </div>
        </div>
      `;
      if (insightContainer) insightContainer.innerHTML = insightHtml;
      
    } else {
      let emptyHtml = `
        <div class="p-space-sm text-center">
          <p class="font-body-sm text-body-sm text-on-surface-variant">No government market records available for the selected commodity/location.</p>
        </div>
      `;
      if (pricesContainer) pricesContainer.innerHTML = emptyHtml;
      if (insightContainer) insightContainer.innerHTML = emptyHtml;
    }
  };

  const getProduceImageBackground = (c) => {
    if (!c || !c.name) return `/assets/images/produce/generic_produce_bg.jpg`;
    const n = c.name.toLowerCase();
    
    // 1. Exact matches
    if (n.includes('wheat')) return `/assets/images/produce/wheat_bg.jpg`;
    if (n.includes('rice') || n.includes('paddy')) return `/assets/images/produce/rice_bg.jpg`;
    if (n.includes('maize') || n.includes('corn')) return `/assets/images/produce/maize_bg.jpg`;
    if (n.includes('bajra')) return `/assets/images/produce/bajra_bg.jpg`;
    if (n.includes('jowar')) return `/assets/images/produce/jowar_bg.jpg`;
    
    if (n.includes('onion')) return `/assets/images/produce/onion_bg.jpg`;
    if (n.includes('tomato')) return `/assets/images/produce/tomato_bg.jpg`;
    if (n.includes('potato')) return `/assets/images/produce/potato_bg.jpg`;
    if (n.includes('garlic')) return `/assets/images/produce/garlic_bg.jpg`;
    if (n.includes('cabbage')) return `/assets/images/produce/cabbage_bg.jpg`;
    if (n.includes('brinjal') || n.includes('eggplant')) return `/assets/images/produce/brinjal_bg.jpg`;
    
    if (n.includes('apple')) return `/assets/images/produce/apple_bg.jpg`;
    if (n.includes('banana')) return `/assets/images/produce/banana_bg.jpg`;
    if (n.includes('mango')) return `/assets/images/produce/mango_bg.jpg`;
    if (n.includes('orange')) return `/assets/images/produce/orange_bg.jpg`;
    if (n.includes('grapes')) return `/assets/images/produce/grapes_bg.jpg`;
    if (n.includes('pomegranate')) return `/assets/images/produce/pomegranate_bg.jpg`;
    
    if (n.includes('chana') || n.includes('bengal gram') || n.includes('gram')) return `/assets/images/produce/chana_bg.jpg`;
    if (n.includes('tur') || n.includes('arhar')) return `/assets/images/produce/tur_bg.jpg`;
    if (n.includes('moong')) return `/assets/images/produce/moong_bg.jpg`;
    if (n.includes('urad')) return `/assets/images/produce/urad_bg.jpg`;
    if (n.includes('masoor')) return `/assets/images/produce/masoor_bg.jpg`;
    if (n.includes('peas')) return `/assets/images/produce/peas_bg.jpg`;
    
    if (n.includes('groundnut') || n.includes('peanut')) return `/assets/images/produce/groundnut_bg.jpg`;
    if (n.includes('soyabean')) return `/assets/images/produce/soyabean_bg.jpg`;
    if (n.includes('mustard')) return `/assets/images/produce/mustard_bg.jpg`;
    if (n.includes('sesame')) return `/assets/images/produce/sesame_bg.jpg`;
    if (n.includes('cotton')) return `/assets/images/produce/cotton_bg.jpg`;

    // 2. Category Fallbacks
    if (c.category) {
      const cat = c.category.toLowerCase();
      if (cat.includes('pulse') || cat.includes('legume') || cat.includes('dal')) return `/assets/images/produce/pulses_category_bg.jpg`;
      if (cat.includes('cereal') || cat.includes('grain')) return `/assets/images/produce/cereals_category_bg.jpg`;
      if (cat.includes('vegetable')) return `/assets/images/produce/vegetables_category_bg.jpg`;
      if (cat.includes('fruit')) return `/assets/images/produce/fruits_category_bg.jpg`;
      if (cat.includes('oilseed')) return `/assets/images/produce/oilseeds_category_bg.jpg`;
    }

    // 3. Generic fallback
    return `/assets/images/produce/generic_produce_bg.jpg`;
  };

  const renderExploreProduce = () => {
    const pricesContainer = document.getElementById('mi-prices-container');
    const insightContainer = document.getElementById('mi-insight-container');
    
    if (insightContainer) insightContainer.innerHTML = '';
    
    if (!window.farmerCommodities || window.farmerCommodities.length === 0) {
      if (pricesContainer) pricesContainer.innerHTML = `
        <div class="p-space-sm text-center">
          <p class="font-body-sm text-body-sm text-on-surface-variant">Select a produce to view current mandi prices.</p>
        </div>
      `;
      return;
    }
    
    const preferred = ['Wheat', 'Onion', 'Tomato', 'Potato', 'Apple', 'Banana', 'Garlic', 'Gram'];
    let previewItems = window.farmerCommodities.filter(c => preferred.some(p => c.name.toLowerCase().includes(p.toLowerCase())));
    
    if (previewItems.length < 8) {
      const others = window.farmerCommodities.filter(c => !previewItems.includes(c));
      previewItems = previewItems.concat(others.slice(0, 8 - previewItems.length));
    } else {
      previewItems = previewItems.slice(0, 8);
    }
    
    let html = `
      <div class="mb-space-md bg-white p-space-md rounded-xl border border-emerald-900/10 shadow-sm text-center">
        <h3 class="font-title-lg text-title-lg text-primary font-semibold mb-space-2xs">Explore Produce</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Select a produce to view current Government mandi prices.</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-space-sm text-left">
    `;
    
    previewItems.forEach(c => {
      html += `
        <div class="p-space-sm border border-emerald-900/10 rounded-lg bg-white hover:border-emerald-300 transition-colors cursor-pointer flex flex-col items-center justify-end text-center gap-space-2xs explore-card relative overflow-hidden group min-h-[100px]" data-produce="${c.name}">
          <!-- Photo Background Overlay -->
          <div class="absolute inset-0 opacity-40 group-hover:opacity-50 transition-opacity pointer-events-none bg-no-repeat bg-cover bg-center brightness-110 saturate-150" style="background-image: url('${getProduceImageBackground(c)}');"></div>
          <!-- Subtle Gradient Overlay -->
          <div class="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-white/90 via-white/30 to-transparent pointer-events-none"></div>
          
          <span class="relative z-10 font-label-md text-label-md text-primary font-bold line-clamp-1 mt-auto drop-shadow-sm">${c.name}</span>
          ${c.category ? `<span class="relative z-10 text-[10px] text-primary-dark font-semibold bg-white/90 px-2 py-0.5 rounded-full border border-emerald-900/10 backdrop-blur-sm shadow-sm mb-1">${c.category}</span>` : ''}
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    if (pricesContainer) {
        pricesContainer.innerHTML = html;
        const cards = pricesContainer.querySelectorAll('.explore-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const cropSelect = document.getElementById('mi-produce-select');
                if (cropSelect) {
                    cropSelect.value = card.dataset.produce;
                    loadMarketData(card.dataset.produce);
                }
            });
        });
    }
  };

  const cropSelect = document.getElementById('mi-produce-select');
  if (cropSelect) {
    cropSelect.addEventListener('change', (e) => {
      loadMarketData(e.target.value);
    });
    // Initial load
    loadMarketData(cropSelect.value);
  }

  window.addEventListener('commoditiesLoaded', () => {
    if (cropSelect && !cropSelect.value) {
      renderExploreProduce();
    }
  });
});
