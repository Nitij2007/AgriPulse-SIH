const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'agripulse-dev-secret-sih26132';

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, state, city } = req.body;

    if (!name || !password || !role) {
      return res.status(400).json({ error: 'name, password, and role are required' });
    }

    if (!email && !phone) {
      return res.status(400).json({ error: 'Either email or phone is required' });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Check duplicate
    const identifier = email || phone;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] }
    });
    
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please use the correct login page.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        passwordHash,
        role,
        isVerified: false // Explicitly false
      }
    });

    if (role === 'FARMER') {
      await prisma.farmerProfile.create({
        data: { userId: user.id, name, state: state || null, city: city || null }
      });
    } else if (role === 'BUYER') {
      await prisma.buyerProfile.create({
        data: { userId: user.id, companyName: name, state: state || null, city: city || null }
      });
    }

    if (email) {
      // Generate a 6-digit OTP
      const crypto = require('crypto');
      const otp = crypto.randomInt(100000, 999999).toString();
      
      // Hash the OTP securely
      const otpHash = await bcrypt.hash(otp, 10);
      
      // Set expiry to 10 minutes from now
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCodeHash: otpHash,
          verificationCodeExpiresAt: otpExpiry
        }
      });

      await emailService.sendVerificationEmail(email, otp);
      
      res.status(201).json({
        message: 'Registration successful. A verification code has been sent to your email.'
      });
    } else {
      res.status(201).json({
        message: 'Registration successful. SMS verification not implemented.'
      });
    }

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User is already verified' });
    
    if (!user.verificationCodeHash || !user.verificationCodeExpiresAt) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }

    if (new Date() > user.verificationCodeExpiresAt) {
      return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
    }

    const isValidOtp = await bcrypt.compare(otp, user.verificationCodeHash);
    if (!isValidOtp) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        isVerified: true,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null
      }
    });

    res.status(200).json({ message: 'Account verified successfully' });

  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User is already verified' });

    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCodeHash: otpHash,
        verificationCodeExpiresAt: otpExpiry
      }
    });

    await emailService.sendVerificationEmail(email, otp);
    
    res.status(200).json({ message: 'A new verification code has been sent to your email.' });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, phone, password, name, role } = req.body;

    const identifier = email || phone;
    let user = null;
    
    if (identifier) {
      user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { phone: identifier }] }
      });
    }

    if (!user) {
      if (role === 'BUYER') {
        return res.status(404).json({ error: 'Account not found. Please create a Buyer account or check your email.' });
      } else if (role === 'FARMER') {
        return res.status(404).json({ error: 'Account not found. Please create a Farmer account or check your email.' });
      }
      return res.status(401).json({ error: 'Account not found.' });
    }

    if (user.role !== role) {
      if (role === 'BUYER' && user.role === 'FARMER') {
        return res.status(403).json({ error: 'This email is registered as a Farmer. Please use Farmer Login.' });
      } else if (role === 'FARMER' && user.role === 'BUYER') {
        return res.status(403).json({ error: 'This email is registered as a Buyer. Please use Buyer Login.' });
      }
      return res.status(403).json({ error: 'Role mismatch' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    if (password) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id },
      include: {
        farmerProfile: true,
        buyerProfile: true
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role,
        farmerProfile: user.farmerProfile,
        buyerProfile: user.buyerProfile
      } 
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { state, city } = req.body;
    if (!state || !city) {
      return res.status(400).json({ error: 'state and city are required' });
    }

    if (decoded.role === 'FARMER') {
      await prisma.farmerProfile.upsert({
        where: { userId: decoded.id },
        update: { state, city },
        create: { userId: decoded.id, name: decoded.name, state, city }
      });
    } else if (decoded.role === 'BUYER') {
      await prisma.buyerProfile.upsert({
        where: { userId: decoded.id },
        update: { state, city },
        create: { userId: decoded.id, companyName: decoded.name, state, city }
      });
    } else {
      return res.status(403).json({ error: 'Invalid role for location update' });
    }

    res.status(200).json({ message: 'Location updated successfully', state, city });
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
