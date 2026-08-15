const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Helper to log emails locally when SMTP is not configured
const logEmailLocally = (to, subject, text, attachments = []) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const logPath = path.join(uploadsDir, 'email-logs.txt');
  const timestamp = new Date().toISOString();
  
  let attachmentInfo = '';
  if (attachments.length > 0) {
    attachmentInfo = `\nAttachments: ${attachments.map(a => a.filename).join(', ')}`;
  }
  
  const logEntry = `
========================================
[${timestamp}]
To: ${to}
Subject: ${subject}
Message:
${text}
${attachmentInfo}
========================================
`;

  fs.appendFileSync(logPath, logEntry, 'utf8');
  console.log(`[Email Mock] Simulated email to ${to} logged to server/uploads/email-logs.txt`);
};

// Create Transporter
const getTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  const transporter = getTransporter();
  
  if (transporter) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || '"TradeArena Support" <support@tradearena.local>',
        to,
        subject,
        text,
        html,
        attachments
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`SMTP Error sending email to ${to}:`, error.message);
      // Fallback to local logging on failure
      logEmailLocally(to, subject, text, attachments);
      return false;
    }
  } else {
    logEmailLocally(to, subject, text, attachments);
    return true;
  }
};

const sendVerificationEmail = async (email, code) => {
  const subject = 'TradeArena - Email Verification Code';
  const text = `Welcome to TradeArena!\n\nYour email verification code is: ${code}\n\nPlease enter this code to complete registration.`;
  const html = `
    <h3>Welcome to TradeArena!</h3>
    <p>Thank you for signing up. Your email verification code is:</p>
    <h2 style="color: #2563eb; letter-spacing: 2px;">${code}</h2>
    <p>Please enter this code on the verification page to activate your trading account.</p>
  `;
  return await sendEmail({ to: email, subject, text, html });
};

const sendOTPEmail = async (email, otp) => {
  const subject = 'TradeArena - Mobile OTP Verification';
  const text = `Your OTP for mobile verification is: ${otp}\n\nThis OTP is valid for 10 minutes.`;
  const html = `
    <h3>TradeArena Verification</h3>
    <p>Your Mobile OTP for verification is:</p>
    <h2 style="color: #10b981; letter-spacing: 2px;">${otp}</h2>
    <p>This OTP will expire in 10 minutes.</p>
  `;
  return await sendEmail({ to: email, subject, text, html });
};

const sendForgotPasswordEmail = async (email, code) => {
  const subject = 'TradeArena - Reset Password Code';
  const text = `You requested a password reset. Your reset code is: ${code}\n\nUse this to set a new password.`;
  const html = `
    <h3>Password Reset Request</h3>
    <p>You have requested to reset your password. Use the following code to reset it:</p>
    <h2 style="color: #ef4444; letter-spacing: 2px;">${code}</h2>
    <p>If you did not request this, please ignore this email.</p>
  `;
  return await sendEmail({ to: email, subject, text, html });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendOTPEmail,
  sendForgotPasswordEmail
};
