const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Initialize Mailgun client
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || 'key-yourkeyhere'
});

// Define Mailgun domain
const DOMAIN = process.env.MAILGUN_DOMAIN || 'sandbox-123.mailgun.org';

const sendMail = async (email, token, link, code, username, expiryTime) => {
  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 15px;">
      <p>Hello <strong>${username}</strong>,</p>
      <p>You recently requested to reset your password.</p>
      <p>Your reset code is: <strong>${code}</strong></p>
      <p>This code is valid until: <strong>${expiryTime.toLocaleString()}</strong></p>
      <p>Or click the link below to reset directly:</p>
      <p><a href="${link}" target="_blank">${link}</a></p>
      <p>If you didn’t request this, you can safely ignore this email.</p>
      <br/>
      <p>Thanks,<br/>Support Team</p>
    </div>
  `;

  try {
    const result = await mg.messages.create(DOMAIN, {
      from: `Excited User <mailgun@${DOMAIN}>`,
      to: [email],
      subject: 'Password Reset Instructions',
      html: html
    });
    console.log(`✅ Reset email sent to ${email}`, result);
  } catch (err) {
    console.error('❌ Email sending error:', err);
    throw new Error('Failed to send reset email');
  }
};

module.exports = sendMail;
