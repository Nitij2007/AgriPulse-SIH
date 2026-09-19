const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Matching Engine: Find lots that match a buyer's requirements
exports.getMatchingLots = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get buyer profile
    const buyerProfile = await prisma.buyerProfile.findUnique({ where: { userId } });
    if (!buyerProfile) {
      return res.status(200).json({ matches: [] });
    }

    // Get buyer's active requirements
    const requirements = await prisma.buyerRequirement.findMany({
      where: { buyerId: buyerProfile.id, status: 'ACTIVE' },
      include: { commodity: true }
    });

    if (requirements.length === 0) {
      return res.status(200).json({ matches: [], message: 'No active requirements to match against' });
    }

    // For each requirement, find matching LISTED lots
    const allMatches = [];

    for (const requirement of requirements) {
      const matchingLots = await prisma.produceLot.findMany({
        where: {
          OR: [
            { commodityId: requirement.commodityId },
            { commodity: { name: { contains: requirement.commodity.name } } }
          ],
          status: 'LISTED',
          quantity: { gte: 1 }, // at least some quantity
          ...(requirement.maxPrice ? { listingPrice: { lte: requirement.maxPrice } } : {})
        },
        include: {
          commodity: true,
          farmer: {
            include: { user: { select: { name: true } } }
          }
        },
        orderBy: { listingPrice: 'asc' }
      });

      allMatches.push({
        requirement: {
          id: requirement.id,
          commodity: requirement.commodity.name,
          quantityNeeded: requirement.quantityNeeded,
          maxPrice: requirement.maxPrice,
          qualitySpecs: requirement.qualitySpecs
        },
        matchingLots: matchingLots.map(lot => ({
          id: lot.id,
          commodity: lot.commodity.name,
          quantity: lot.quantity,
          unit: lot.unit,
          grade: lot.grade,
          moisturePct: lot.moisturePct,
          listingPrice: lot.listingPrice,
          location: lot.location,
          farmerName: lot.farmer?.user?.name || 'Unknown',
          createdAt: lot.createdAt,
          // Match score: simple price-proximity scoring
          matchScore: requirement.maxPrice
            ? Math.round(((requirement.maxPrice - lot.listingPrice) / requirement.maxPrice) * 100)
            : 80
        })),
        totalMatches: matchingLots.length
      });
    }

    res.status(200).json({ matches: allMatches });
  } catch (error) {
    console.error('Matching Error:', error);
    res.status(500).json({ error: 'Failed to run matching engine' });
  }
};

// Get all LISTED lots (for browsing - buyer can see all available produce)
exports.getAllListedLots = async (req, res) => {
  try {
    const lots = await prisma.produceLot.findMany({
      where: { status: 'LISTED' },
      include: {
        commodity: true,
        farmer: {
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      lots: lots.map(lot => ({
        id: lot.id,
        commodity: lot.commodity?.name || 'Unknown',
        quantity: lot.quantity,
        unit: lot.unit,
        grade: lot.grade,
        moisturePct: lot.moisturePct,
        listingPrice: lot.listingPrice,
        location: lot.location,
        farmerName: lot.farmer?.user?.name || 'Unknown',
        status: lot.status,
        createdAt: lot.createdAt
      }))
    });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to fetch listed lots' });
  }
};

// Matching Engine: Find active requirements that match a farmer's listed lots
exports.getMatchingBuyers = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get farmer profile
    const farmerProfile = await prisma.farmerProfile.findUnique({ where: { userId } });
    if (!farmerProfile) {
      return res.status(200).json({ matches: [] });
    }

    // Get farmer's active lots
    const lots = await prisma.produceLot.findMany({
      where: { farmerId: farmerProfile.id, status: 'LISTED', quantity: { gte: 1 } },
      include: { commodity: true }
    });

    if (lots.length === 0) {
      return res.status(200).json({ matches: [], message: 'No active lots to match against' });
    }

    // Find ALL active requirements
    const requirements = await prisma.buyerRequirement.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        commodity: true,
        buyer: {
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const allMatches = [];

    // Grouping/matching
    for (const lot of lots) {
      const matchingReqs = requirements.filter(req => 
        (req.commodityId === lot.commodityId || lot.commodity.name.includes(req.commodity.name)) && 
        (!req.maxPrice || req.maxPrice >= lot.listingPrice)
      );
      
      if (matchingReqs.length > 0) {
        allMatches.push({
          lot: {
            id: lot.id,
            commodity: lot.commodity?.name || 'Unknown',
            quantity: lot.quantity,
            unit: lot.unit,
            listingPrice: lot.listingPrice
          },
        matchingRequirements: matchingReqs.map(req => ({
          id: req.id,
          commodity: req.commodity.name,
          quantityNeeded: req.quantityNeeded,
          maxPrice: req.maxPrice,
          qualitySpecs: req.qualitySpecs,
          locationPref: req.locationPref,
          buyerName: req.buyer?.companyName || req.buyer?.user?.name || 'Unknown Buyer',
          matchScore: 90 // Simulated match score
        })),
        totalMatches: matchingReqs.length
        });
      }
    }

    // Return flat list of requirements for easy rendering in dashboard/matched-buyers page
    // Deduplicate requirements to avoid showing the same buyer requirement multiple times if it matches multiple lots
    const uniqueReqsMap = new Map();
    allMatches.forEach(match => {
      match.matchingRequirements.forEach(req => {
        if (!uniqueReqsMap.has(req.id)) {
          uniqueReqsMap.set(req.id, {
            ...req,
            matchingLotsCount: 1,
            matchedLots: [match.lot]
          });
        } else {
          const existing = uniqueReqsMap.get(req.id);
          existing.matchingLotsCount++;
          existing.matchedLots.push(match.lot);
        }
      });
    });

    res.status(200).json({
      matches: allMatches,
      requirements: Array.from(uniqueReqsMap.values())
    });
  } catch (error) {
    console.error('Matching Error:', error);
    res.status(500).json({ error: 'Failed to run matching engine for farmer' });
  }
};
