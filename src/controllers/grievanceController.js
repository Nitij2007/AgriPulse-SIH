const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createGrievance = async (req, res) => {
  const { transactionId, type, description } = req.body;
  const filedById = req.user.id;
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { lot: { include: { farmer: true } }, offer: true }
    });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.lot.farmer.userId !== filedById && tx.offer.fromUserId !== filedById) {
      return res.status(403).json({ error: 'Not authorized for this transaction' });
    }

    const grievance = await prisma.grievance.create({
      data: {
        transactionId,
        filedById,
        type,
        description,
        status: 'OPEN'
      }
    });
    res.status(201).json({ message: 'Grievance created successfully', grievance });
  } catch (error) {
    console.error('Create Grievance Error:', error);
    res.status(500).json({ error: 'Failed to create grievance' });
  }
};

exports.getGrievancesByUser = async (req, res) => {
  const userId = req.user.id;
  try {
    const grievances = await prisma.grievance.findMany({
      where: {
        OR: [
          { filedById: userId },
          { transaction: { lot: { farmer: { userId } } } },
          { transaction: { offer: { fromUserId: userId } } }
        ]
      },
      include: {
        transaction: {
          include: {
            lot: { include: { commodity: true } },
            offer: true
          }
        },
        filedBy: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ grievances });
  } catch (error) {
    console.error('Get Grievances Error:', error);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
};

exports.getGrievanceById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const grievance = await prisma.grievance.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            lot: { include: { commodity: true, farmer: true } },
            offer: { include: { fromUser: { include: { buyerProfile: true } } } }
          }
        },
        filedBy: true
      }
    });
    if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
    
    if (grievance.transaction.lot.farmer.userId !== userId && grievance.transaction.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this grievance' });
    }

    res.status(200).json({ grievance });
  } catch (error) {
    console.error('Get Grievance Error:', error);
    res.status(500).json({ error: 'Failed to fetch grievance' });
  }
};

exports.updateGrievanceStatus = async (req, res) => {
  const { id } = req.params;
  const { status, resolution } = req.body;
  const userId = req.user.id;
  try {
    const checkGrievance = await prisma.grievance.findUnique({
      where: { id },
      include: { transaction: { include: { lot: { include: { farmer: true } }, offer: true } } }
    });
    if (!checkGrievance) return res.status(404).json({ error: 'Grievance not found' });
    if (checkGrievance.transaction.lot.farmer.userId !== userId && checkGrievance.transaction.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this grievance' });
    }

    const dataToUpdate = {};
    if (status) dataToUpdate.status = status;
    if (resolution) dataToUpdate.resolution = resolution;

    const grievance = await prisma.grievance.update({
      where: { id },
      data: dataToUpdate
    });
    res.status(200).json({ message: 'Grievance updated', grievance });
  } catch (error) {
    console.error('Update Grievance Error:', error);
    res.status(500).json({ error: 'Failed to update grievance' });
  }
};
