const nodemailer = require('nodemailer');

let transporter;

async function createTransporter() {
  if (transporter) return transporter;
  
  transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });
  return transporter;
}

exports.sendVerificationEmail = async (to, otp) => {
  try {
    const tp = await createTransporter();

    const info = await tp.sendMail({
      from: '"AgriPulse" <nitijyadav1208@gmail.com>',
      to,
      subject: 'AgriPulse - Your Verification Code',
      text: `Welcome to AgriPulse!\n\nYour verification code is: ${otp}\nThis code will expire in 10 minutes.\nPlease enter this code in the AgriPulse app to verify your account.`,
      html: `<div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #0f382c;">Welcome to AgriPulse!</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #22c55e; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>Please enter this code in the AgriPulse app to verify your account.</p>
      </div>`,
    });

    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification email', error);
    throw error;
  }
};
