const jwt = require('jsonwebtoken');
const sendMail = require('../Utils/mailer.js');

const createJWTToken = (user_id, email) => {
  return jwt.sign({ user_id, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const generateReferralLink = (token) => {
  return `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
};

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000); // 6-digit
};

module.exports = {
  createJWTToken,
  generateReferralLink,
  generateResetCode,
  sendMail,
};
