const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createLot = async (req, res) => {
  const lotData = req.body;
  const farmerId = req.user.id; // from auth middleware
  
  try {
    const commodityName = lotData.commodity || 'Unknown Produce';
    
    // Dynamically find or create the commodity requested by the user
    let commodity = await prisma.commodity.findFirst({
      where: { name: commodityName }
    });
    
    if (!commodity) {
      commodity = await prisma.commodity.create({
        data: { name: commodityName, category: 'General', unit: lotData.unit || 'Quintal' }
      });
    }

    // Ensure farmer profile exists for this user (Prisma requires it for the relation)
    let farmerProfile = await prisma.farmerProfile.findUnique({ where: { userId: farmerId } });
    if (!farmerProfile) {
      farmerProfile = await prisma.farmerProfile.create({
        data: { userId: farmerId, name: req.user.name || 'Farmer' }
      });
    }

    const newLot = await prisma.produceLot.create({
      data: {
        farmerId: farmerProfile.id,
        commodityId: commodity.id,
        quantity: parseFloat(lotData.quantity) || 10,
        unit: lotData.unit || 'Quintal',
        grade: lotData.grade || 'Standard',
        moisturePct: parseFloat(lotData.moisture) || 12,
        listingPrice: parseFloat(lotData.price) || 2000,
        location: lotData.location || 'Farm Gate'
      }
    });
    res.status(201).json({ message: 'Produce lot created successfully', lot: newLot });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to create lot' });
  }
};

exports.getLots = async (req, res) => {
  try {
    const farmerId = req.user.id;

    // Get the farmer profile first
    const farmerProfile = await prisma.farmerProfile.findUnique({ where: { userId: farmerId } });
    
    if (!farmerProfile) {
      return res.status(200).json({ lots: [] }); // No profile = no lots
    }

    const lots = await prisma.produceLot.findMany({
      where: { farmerId: farmerProfile.id },
      include: {
        commodity: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ lots });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
};
