const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create an offer on a lot
exports.createOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lotId, offeredPrice, quantity, message } = req.body;

    if (!lotId || !offeredPrice) {
      return res.status(400).json({ error: 'lotId and offeredPrice are required' });
    }

    // Verify lot exists and is LISTED
    const lot = await prisma.produceLot.findUnique({ where: { id: lotId } });
    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    if (lot.status !== 'LISTED') {
      return res.status(400).json({ error: 'Lot is not available for offers' });
    }

    const offer = await prisma.offer.create({
      data: {
        fromUserId: userId,
        lotId: lotId,
        offeredPrice: parseFloat(offeredPrice),
        quantity: parseFloat(quantity) || lot.quantity,
        message: message || null,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Offer submitted successfully', offer });
  } catch (error) {
    console.error('Offer Error:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
};

// Get offers made by this user
exports.getMyOffers = async (req, res) => {
  try {
    const userId = req.user.id;

    const offers = await prisma.offer.findMany({
            where: {
        OR: [
          { fromUserId: userId },
          { lot: { farmer: { userId: userId } } }
        ]
      },
      include: {
        transaction: true,
        fromUser: {
          include: {
            buyerProfile: true
          }
        },
        lot: {
          include: {
            commodity: true,
            farmer: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ offers });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
};

// Accept an offer (for farmer)
exports.acceptOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await prisma.offer.findUnique({ 
      where: { id: offerId },
      include: { lot: { include: { farmer: true } } }
    });
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.lot.farmer.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to accept this offer' });
    }

    // Update offer status
    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: 'ACCEPTED' }
    });

    if (offer.lotId) {
      const existingTxn = await prisma.transaction.findUnique({ where: { offerId: offer.id } });
      if (!existingTxn) {
        // Create a Transaction automatically with a nested simulated Payment record
        await prisma.transaction.create({
          data: {
            offerId: offer.id,
            lotId: offer.lotId,
            agreedPrice: offer.offeredPrice,
            totalAmount: offer.offeredPrice * offer.quantity,
            status: 'INITIATED',
            payments: {
              create: {
                type: 'SETTLEMENT',
                amount: offer.offeredPrice * offer.quantity,
                status: 'PENDING',
                paymentMethod: 'Simulated Digital Settlement'
              }
            }
          }
        });

        // Update the lot status to SOLD
        await prisma.produceLot.update({
          where: { id: offer.lotId },
          data: { status: 'SOLD' }
        });
      }
    }

    res.status(200).json({ message: 'Offer accepted', offer: updatedOffer });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
};

// Reject an offer (for farmer)
exports.rejectOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await prisma.offer.findUnique({ 
      where: { id: offerId },
      include: { lot: { include: { farmer: true } } }
    });
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.lot.farmer.userId !== req.user.id && offer.fromUserId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to reject this offer' });
    }

    // Update offer status
    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: 'REJECTED' }
    });

    res.status(200).json({ message: 'Offer rejected', offer: updatedOffer });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
};
