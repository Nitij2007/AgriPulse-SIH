const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getCommodities = async (req, res) => {
  try {
    const commodities = await prisma.commodity.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        category: true // Optional but nice for grouping
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      count: commodities.length,
      commodities
    });
  } catch (error) {
    console.error('Error fetching commodities:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getCommodities
};
