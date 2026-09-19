const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createPayment = async (req, res) => {
  const { transactionId, type, amount, paymentMethod, utrNumber, status, paidAt } = req.body;
  const userId = req.user.id;
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { lot: { include: { farmer: true } }, offer: true }
    });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.lot.farmer.userId !== userId && tx.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized for this transaction' });
    }

    const payment = await prisma.payment.create({
      data: {
        transactionId,
        type,
        amount: parseFloat(amount),
        paymentMethod,
        utrNumber,
        status: status || 'PENDING',
        paidAt: paidAt ? new Date(paidAt) : null
      }
    });
    res.status(201).json({ message: 'Payment created successfully', payment });
  } catch (error) {
    console.error('Create Payment Error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

exports.getPaymentsByUser = async (req, res) => {
  const userId = req.user.id;
  try {
    // A user can be involved in a payment either as a buyer (made payment) or farmer (received payment)
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { transaction: { lot: { farmer: { userId } } } },
          { transaction: { offer: { fromUserId: userId } } }
        ]
      },
      include: {
        transaction: {
          include: {
            lot: { include: { commodity: true } },
            offer: { include: { fromUser: { include: { buyerProfile: true } } } }
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });
    res.status(200).json({ payments });
  } catch (error) {
    console.error('Get Payments Error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

exports.getPaymentsByTransaction = async (req, res) => {
  const { txId } = req.params;
  const userId = req.user.id;
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: txId },
      include: { lot: { include: { farmer: true } }, offer: true }
    });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.lot.farmer.userId !== userId && tx.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized for this transaction' });
    }

    const payments = await prisma.payment.findMany({
      where: { transactionId: txId },
      orderBy: { paidAt: 'asc' }
    });
    res.status(200).json({ payments });
  } catch (error) {
    console.error('Get Transaction Payments Error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction payments' });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, paymentMethod, utrNumber, paidAt } = req.body;
  const userId = req.user.id;
  try {
    const checkPayment = await prisma.payment.findUnique({
      where: { id },
      include: { transaction: { include: { lot: { include: { farmer: true } }, offer: true } } }
    });
    if (!checkPayment) return res.status(404).json({ error: 'Payment not found' });
    if (checkPayment.transaction.lot.farmer.userId !== userId && checkPayment.transaction.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this payment' });
    }

    const dataToUpdate = {};
    if (status) dataToUpdate.status = status;
    if (paymentMethod) dataToUpdate.paymentMethod = paymentMethod;
    if (utrNumber) dataToUpdate.utrNumber = utrNumber;
    if (paidAt) dataToUpdate.paidAt = new Date(paidAt);

    const payment = await prisma.payment.update({
      where: { id },
      data: dataToUpdate
    });

    if (status === 'COMPLETED') {
      await prisma.transaction.update({
        where: { id: payment.transactionId },
        data: { status: 'SETTLED' }
      });
    }
    res.status(200).json({ message: 'Payment updated', payment });
  } catch (error) {
    console.error('Update Payment Error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};
