const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createTransaction = async (req, res) => {
  const { offerId, lotId, agreedPrice, totalAmount } = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: {
        offerId,
        lotId,
        agreedPrice: parseFloat(agreedPrice),
        totalAmount: parseFloat(totalAmount),
        status: 'INITIATED'
      }
    });
    res.status(201).json({ message: 'Transaction created successfully', transaction });
  } catch (error) {
    console.error('Transaction Create Error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

exports.getFarmerTransactions = async (req, res) => {
  const farmerUserId = req.user.id;
  try {
    const farmerProfile = await prisma.farmerProfile.findUnique({ where: { userId: farmerUserId } });
    if (!farmerProfile) return res.status(200).json({ transactions: [] });

    const transactions = await prisma.transaction.findMany({
      where: {
        lot: {
          farmerId: farmerProfile.id
        }
      },
      include: {
        lot: {
          include: { commodity: true }
        },
        offer: {
          include: { fromUser: { include: { buyerProfile: true } } }
        },
        logistics: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Get Farmer Transactions Error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

exports.getBuyerTransactions = async (req, res) => {
  const buyerUserId = req.user.id;
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        offer: {
          fromUserId: buyerUserId
        }
      },
      include: {
        lot: {
          include: { commodity: true, farmer: true }
        },
        offer: true,
        logistics: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Get Buyer Transactions Error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

exports.getTransactionById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        lot: { include: { commodity: true, farmer: true } },
        offer: { include: { fromUser: { include: { buyerProfile: true } } } },
        logistics: true,
        payments: true,
        grievances: true
      }
    });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    if (transaction.lot.farmer.userId !== userId && transaction.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this transaction' });
    }

    res.status(200).json({ transaction });
  } catch (error) {
    console.error('Get Transaction Error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

exports.updateTransactionStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  try {
    const transactionCheck = await prisma.transaction.findUnique({
      where: { id },
      include: { lot: { include: { farmer: true } }, offer: true }
    });
    if (!transactionCheck) return res.status(404).json({ error: 'Transaction not found' });

    if (transactionCheck.lot.farmer.userId !== userId && transactionCheck.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this transaction' });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: { status }
    });
    res.status(200).json({ message: 'Transaction status updated', transaction });
  } catch (error) {
    console.error('Update Transaction Status Error:', error);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
};
