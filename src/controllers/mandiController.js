const fs = require('fs');
const path = require('path');
const cache = new Map();

// Helper for persistent cache
const CACHE_FILE = process.env.VERCEL ? path.join('/tmp', 'mandi_cache.json') : path.join(process.cwd(), 'scratch', 'mandi_cache.json');

function readPersistentCache(key) {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            return data[key];
        }
    } catch (e) {
        console.error("Error reading persistent cache:", e);
    }
    return null;
}

function writePersistentCache(key, value) {
    try {
        let data = {};
        if (fs.existsSync(CACHE_FILE)) {
            data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        }
        data[key] = value;
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data), 'utf8');
    } catch (e) {
        console.error("Error writing persistent cache:", e);
    }
}

exports.getMarketPrices = async (req, res) => {
  try {
    const apiKey = process.env.DATA_GOV_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ 
        error: 'Government API key not configured. Please set DATA_GOV_API_KEY in the server environment.' 
      });
    }

    const { state, district, commodity } = req.query;

    if (!state) return res.status(400).json({ error: 'state is a required parameter.' });
    if (!commodity) return res.status(400).json({ error: 'commodity is a required parameter.' });

    let normalizedCommodity = commodity;
    const lowerComm = commodity.toLowerCase();
    
    // Map internal DB catalogue names to Government API exact names
    if (lowerComm.includes('wheat')) normalizedCommodity = 'Wheat';
    else if (lowerComm.includes('chana') || lowerComm.includes('gram')) normalizedCommodity = 'Bengal Gram(Gram)(Whole)';
    else if (lowerComm.includes('cotton')) normalizedCommodity = 'Cotton';
    else if (lowerComm.includes('rice') || lowerComm.includes('paddy')) normalizedCommodity = 'Paddy(Common)';
    else if (lowerComm.includes('onion')) normalizedCommodity = 'Onion';
    else if (lowerComm.includes('potato')) normalizedCommodity = 'Potato';
    else if (lowerComm.includes('tomato')) normalizedCommodity = 'Tomato';
    else if (lowerComm.includes('bajra') || lowerComm.includes('pearl millet')) normalizedCommodity = 'Bajra(Pearl Millet/Cumbu)';
    else if (lowerComm.includes('maize') || lowerComm.includes('corn')) normalizedCommodity = 'Maize';
    else if (lowerComm.includes('groundnut') || lowerComm.includes('peanut')) normalizedCommodity = 'Groundnut';
    else if (lowerComm.includes('soyabean')) normalizedCommodity = 'Soyabean';
    else if (lowerComm.includes('mustard')) normalizedCommodity = 'Mustard';
    else if (lowerComm.includes('garlic')) normalizedCommodity = 'Garlic';
    else if (lowerComm.includes('brinjal')) normalizedCommodity = 'Brinjal';
    else if (lowerComm.includes('cabbage')) normalizedCommodity = 'Cabbage';
    else if (lowerComm.includes('cauliflower')) normalizedCommodity = 'Cauliflower';
    else if (lowerComm.includes('lemon')) normalizedCommodity = 'Lemon';
    else if (lowerComm.includes('guar')) normalizedCommodity = 'Guar';
    else if (lowerComm.includes('moong')) normalizedCommodity = 'Green Gram(Moong)(Whole)';
    else if (lowerComm.includes('urad')) normalizedCommodity = 'Black Gram (Urd Beans)(Whole)';
    else if (lowerComm.includes('masoor')) normalizedCommodity = 'Lentil (Masur)(Whole)';
    else if (lowerComm.includes('apple')) normalizedCommodity = 'Apple';
    else if (lowerComm.includes('banana')) normalizedCommodity = 'Banana';
    else if (lowerComm.includes('mango')) normalizedCommodity = 'Mango';
    else if (lowerComm.includes('orange')) normalizedCommodity = 'Orange';
    else if (lowerComm.includes('grapes')) normalizedCommodity = 'Grapes';
    else if (lowerComm.includes('pomegranate')) normalizedCommodity = 'Pomegranate';
    else if (lowerComm.includes('cumin') || lowerComm.includes('jeera')) normalizedCommodity = 'Cummin Seed(Jeera)';

    const cacheKey = `${state}-${district || 'ALL'}-${normalizedCommodity}`;
    const cachedEntry = cache.get(cacheKey);
    const ttl = (cachedEntry && cachedEntry.expiresIn) ? cachedEntry.expiresIn : 15 * 60 * 1000;
    if (cachedEntry && Date.now() - cachedEntry.timestamp < ttl) {
      if (cachedEntry.data.isError) {
        return res.status(502).json(cachedEntry.data);
      }
      // If it's served from memory, mark appropriately based on its original source
      return res.status(200).json(cachedEntry.data);
    }

    const resourceId = '9ef84268-d588-465a-a308-a864a43d0070';
    const apiUrl = `https://api.data.gov.in/resource/${resourceId}`;
    
    // Function to fetch data with timeout
    const fetchGovData = async (queryDistrict) => {
      const params = new URLSearchParams({
        'api-key': apiKey,
        format: 'json',
        limit: 15,
        'filters[state]': state,
        'filters[commodity]': normalizedCommodity
      });
      if (queryDistrict) params.append('filters[district]', queryDistrict);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout per request
      
      try {
        const response = await fetch(`${apiUrl}?${params.toString()}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        return await response.json();
      } catch (err) {
        clearTimeout(timeoutId);
        return null;
      }
    };

    let isFallback = false;
    let data = await fetchGovData(district);

    // Automatic internal fallback if no records found
    // ONLY do this if the API successfully responded but found 0 records.
    // If data is null (timeout/network error), do NOT try again.
    if (data && district && (!data.records || data.records.length === 0)) {
      isFallback = true;
      data = await fetchGovData(null);
    }

    if (!data || !data.records || !Array.isArray(data.records)) {
      
      // SOURCE 2: Agmarknet 2.0 attempt
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const agmarkRes = await fetch("https://api.agmarknet.gov.in/v1/prices-and-arrivals/commodity-market/daily-report-state-marketwise", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (agmarkRes.ok) {
           const agmarkData = await agmarkRes.json();
           // If we got real data, we would map it here.
           // Since the endpoint is currently failing with 500, this block acts as a resilient fallback check.
        }
      } catch (e) {
        // Suppress Agmarknet errors
      }

      // SOURCE 3: Persistent Cache Fallback
      const persistentData = readPersistentCache(cacheKey);
      if (persistentData) {
        const staleData = { ...persistentData };
        staleData.isStale = true;
        staleData.source = "GOVERNMENT_CACHE";
        
        // Cache this fallback in memory for short duration to avoid repetitive disk reads
        cache.set(cacheKey, { timestamp: Date.now(), data: staleData, expiresIn: 15 * 60 * 1000 });
        return res.status(200).json(staleData);
      }
      
      // Temporarily cache the absolute failure (2 mins) to enable fast 502s and prevent upstream hammering
      cache.set(cacheKey, { timestamp: Date.now(), data: { error: 'Government mandi data temporarily unavailable.', isError: true }, expiresIn: 2 * 60 * 1000 });
      return res.status(502).json({ error: 'Government mandi data temporarily unavailable.' });
    }

    if (data.records.length === 0) {
      return res.status(404).json({ error: `No government market records available for the selected commodity/location.` });
    }

    const normalizedResponse = {
      source: "Government of India - data.gov.in",
      dataFrequency: "Daily",
      location: { state, district: isFallback ? undefined : district },
      isFallback: isFallback,
      isStale: false,
      commodity: commodity,
      markets: data.records.map(record => ({
        market: record.market || record.market_center || 'Unknown',
        district: record.district || district,
        commodity: record.commodity,
        variety: record.variety || 'Other',
        minPrice: parseFloat(record.min_price) || 0,
        maxPrice: parseFloat(record.max_price) || 0,
        modalPrice: parseFloat(record.modal_price) || 0,
        priceDate: record.arrival_date || record.price_date || 'Unknown'
      }))
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: normalizedResponse });
    writePersistentCache(cacheKey, normalizedResponse);
    return res.status(200).json(normalizedResponse);

  } catch (error) {
    console.error('getMarketPrices error:', error);
    res.status(500).json({ error: 'Internal server error while fetching market data.' });
  }
};
