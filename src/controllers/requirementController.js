const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createRequirement = async (req, res) => {
  const reqData = req.body;
  const userId = req.user.id;

  try {
    const commodityName = reqData.commodity || 'Unknown Produce';
    
    // Find or create commodity
    let commodity = await prisma.commodity.findFirst({
      where: { name: commodityName }
    });
    
    if (!commodity) {
      commodity = await prisma.commodity.create({
        data: { name: commodityName, category: 'General', unit: reqData.unit || 'Quintal' }
      });
    }

    // Ensure buyer profile exists
    let buyerProfile = await prisma.buyerProfile.findUnique({ where: { userId: userId } });
    if (!buyerProfile) {
      buyerProfile = await prisma.buyerProfile.create({
        data: { userId: userId, companyName: req.user.name || 'Buyer Company' }
      });
    }

    const newReq = await prisma.buyerRequirement.create({
      data: {
        buyerId: buyerProfile.id,
        commodityId: commodity.id,
        quantityNeeded: parseFloat(reqData.quantity) || 100,
        maxPrice: parseFloat(reqData.price) || null,
        qualitySpecs: reqData.qualitySpecs || null,
        locationPref: reqData.locationPref || null,
        status: 'ACTIVE'
      }
    });

    res.status(201).json({ message: 'Requirement published successfully', requirement: newReq });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
};

exports.getRequirements = async (req, res) => {
  try {
    const userId = req.user.id;

    const buyerProfile = await prisma.buyerProfile.findUnique({ where: { userId: userId } });
    if (!buyerProfile) {
      return res.status(200).json({ requirements: [] });
    }

    const requirements = await prisma.buyerRequirement.findMany({
      where: { buyerId: buyerProfile.id },
      include: {
        commodity: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ requirements });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
};
