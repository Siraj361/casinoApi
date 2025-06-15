// File: authModule/index.js
const Joi = require('joi');
const db = require('../../Model/index.js');
const User = db.User;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { registerScheme,   resetPasswordScheme } = require('../../validation/validAuth.js');
const { Op } = require('sequelize');
const crypto = require('crypto');
    //   const sendMail = require('../../Utils/mailer.js');
      const {
  createJWTToken,
  generateReferralLink,
  generateResetCode,
  sendMail,
} = require('../../Includes/function.js');
const message =
    "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, 1 special character, and be at least 8 characters long.";

const forgetPasswordScheme = Joi.object({
    email: Joi.string().email().required(),
});

const loginScheme = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
        .regex(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
        .message(message)
        .required(),
    rememberMe: Joi.boolean().optional()
});

const register = async (req, res) => {
    try {
        // Validate request body
        const { error, value } = registerScheme.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        const {username, email, password, first_name, last_name, birthdate, address, country, city, nationality, age } = value;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            if (existingUser.email_verify) {
                return res.status(400).json({ error: "User with this email already exists and email is verified" });
            } else {
                return res.status(400).json({ error: "User with this email already exists and email is not verified" });
            }
        }
        const email2 = email.slice(0, 5);
       
        const hashedPassword = await bcrypt.hash(password, 10);

        
        const newUser = await User.create({
            username: username,
            email: email,
            first_name: first_name , 
            last_name: last_name , 
            password: hashedPassword,
            birthdate: birthdate,
            address: address,
            country: country ,
            city: city,
            Nationality: nationality ,
            age: age 
        });

        const token = createJWTToken(newUser.id, newUser.email);

        res.status(200).json({ message: "Registration successful", user: newUser, token });
    } catch (error) {
        console.error("Error in adding user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const login = async (req, res) => {
    try {
        const { error, value } = loginScheme.validate(req.body);
        if (error) return res.status(400).json({ error: error.message });

        const user = await User.findOne({ where: { email: value.email } });
        if (!user || !(await bcrypt.compare(value.password, user.password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = createJWTToken(user.id, user.email);
        res.status(200).json({ message: 'Login successful', token });
    } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
}
};

const forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgetPasswordScheme.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const user = await User.findOne({ where: { email: value.email } });
    if (!user) return res.status(404).json({ error: 'Email not registered' });

    const token = createJWTToken(user.id, user.email);
    const resetLink = generateReferralLink(token);
    const code = generateResetCode();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await sendMail(user.email, token, resetLink, code, user.username, expiry);

    res.status(200).json({ message: 'Reset link sent to email' });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.query;
        const { error, value } = resetPasswordScheme.validate(req.body);
        if (error) return res.status(400).json({ error: error.message });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const hashedPassword = await bcrypt.hash(value.newPassword, 10);

        await User.update({ password: hashedPassword }, { where: { id: decoded.user_id } });
        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};
