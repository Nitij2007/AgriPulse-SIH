const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createLogistics = async (req, res) => {
  const { transactionId, carrierName, vehicleNumber, driverName, driverPhone, origin, destination, pickupDate, deliveryDate } = req.body;
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

    const logistics = await prisma.logistics.create({
      data: {
        transactionId,
        carrierName,
        vehicleNumber,
        driverName,
        driverPhone,
        origin,
        destination,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        status: 'PENDING'
      }
    });
    res.status(201).json({ message: 'Logistics created successfully', logistics });
  } catch (error) {
    console.error('Create Logistics Error:', error);
    res.status(500).json({ error: 'Failed to create logistics' });
  }
};

exports.getLogisticsByTransaction = async (req, res) => {
  const { txId } = req.params;
  const userId = req.user.id;
  try {
    const logistics = await prisma.logistics.findUnique({
      where: { transactionId: txId },
      include: { transaction: { include: { lot: { include: { farmer: true } }, offer: true } } }
    });
    if (!logistics) return res.status(404).json({ error: 'Logistics not found' });
    if (logistics.transaction.lot.farmer.userId !== userId && logistics.transaction.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized for this logistics' });
    }
    res.status(200).json({ logistics });
  } catch (error) {
    console.error('Get Logistics Error:', error);
    res.status(500).json({ error: 'Failed to fetch logistics' });
  }
};

exports.updateLogisticsStatus = async (req, res) => {
  const { id } = req.params;
  const { status, gpsLat, gpsLng, carrierName, vehicleNumber, driverName, driverPhone, pickupDate, deliveryDate } = req.body;
  const userId = req.user.id;
  try {
    const checkLogistics = await prisma.logistics.findUnique({
      where: { id },
      include: { transaction: { include: { lot: { include: { farmer: true } }, offer: true } } }
    });
    if (!checkLogistics) return res.status(404).json({ error: 'Logistics not found' });
    if (checkLogistics.transaction.lot.farmer.userId !== userId && checkLogistics.transaction.offer.fromUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this logistics' });
    }

    const dataToUpdate = {};
    if (status) dataToUpdate.status = status;
    if (gpsLat !== undefined) dataToUpdate.gpsLat = parseFloat(gpsLat);
    if (gpsLng !== undefined) dataToUpdate.gpsLng = parseFloat(gpsLng);
    if (carrierName) dataToUpdate.carrierName = carrierName;
    if (vehicleNumber) dataToUpdate.vehicleNumber = vehicleNumber;
    if (driverName) dataToUpdate.driverName = driverName;
    if (driverPhone) dataToUpdate.driverPhone = driverPhone;
    if (pickupDate) dataToUpdate.pickupDate = new Date(pickupDate);
    if (deliveryDate) dataToUpdate.deliveryDate = new Date(deliveryDate);

    const logistics = await prisma.logistics.update({
      where: { id },
      data: dataToUpdate
    });
    res.status(200).json({ message: 'Logistics updated', logistics });
  } catch (error) {
    console.error('Update Logistics Error:', error);
    res.status(500).json({ error: 'Failed to update logistics' });
  }
};

exports.getMyLogistics = async (req, res) => {
  const userId = req.user.id;
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { offer: { fromUserId: userId } },
          { lot: { farmer: { userId: userId } } }
        ]
      },
      include: {
        logistics: true,
        lot: {
          include: {
            commodity: true,
            farmer: true
          }
        },
        offer: {
          include: {
            fromUser: {
              include: { buyerProfile: true }
            }
          }
        }
      }
    });

    const enhancedLogistics = transactions.map(t => {
      const baseLogistics = t.logistics || {
        status: 'PENDING',
        origin: t.lot.location || 'Local Mandi',
        destination: t.offer.fromUser.buyerProfile ? t.offer.fromUser.buyerProfile.organizationName : 'Warehouse',
        carrierName: null,
        vehicleNumber: null,
        driverName: null,
        driverPhone: null
      };

      return {
        ...baseLogistics,
        transaction: {
          id: t.id,
          status: t.status,
          createdAt: t.createdAt,
          agreedPrice: t.agreedPrice,
          totalAmount: t.totalAmount,
          lot: t.lot,
          offer: t.offer
        }
      };
    });

    res.status(200).json({ logistics: enhancedLogistics });
  } catch (error) {
    console.error('Get My Logistics Error:', error);
    res.status(500).json({ error: 'Failed to fetch logistics' });
  }
};
