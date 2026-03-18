const Joi = require('joi');
const message =
    "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, 1 special character, and be at least 8 characters long.";


    const registerScheme = Joi.object({
    email: Joi.string().email().required(), // Email field
    password: Joi.string()
        .regex(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
        .message("Password must contain at least one number, one uppercase letter, one special character, and be at least 8 characters long.")
        .required(), // Password field with regex
    // first_name: Joi.string().optional(), // Optional first name field
    // last_name: Joi.string().optional(),  // Optional last name field
    // birthdate: Joi.date().optional(),    // Optional birthdate field
    // address: Joi.string().optional(),    // Optional address field
    // country: Joi.string().optional(),    // Optional country field
    // city: Joi.string().optional(),       // Optional city field
    // nationality: Joi.string().optional(),// Optional nationality field
    // age: Joi.number().optional(),         // Optional age field
    username: Joi.string().optional()    // Optional username field
});

const loginScheme = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().optional(),
});

const forgetPasswordScheme = Joi.object({
    email: Joi.string().email().required(),
});

const resetPasswordScheme = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string()
        .regex(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
        .message(message)
        .required(),
});

const passwordMessage =
  "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, 1 special character, and be at least 8 characters long.";

const updateProfileScheme = Joi.object({
  full_name: Joi.string().trim().max(100).allow("", null).optional(),
  username: Joi.string().trim().min(3).max(50).allow("", null).optional(),
  phone: Joi.string().trim().max(20).allow("", null).optional(),
  avatar_url: Joi.string().allow("", null).optional(),
});

module.exports = {
    registerScheme: registerScheme,
    loginScheme: loginScheme,
    forgetPasswordScheme: forgetPasswordScheme,
    resetPasswordScheme: resetPasswordScheme,
    updateProfileScheme: updateProfileScheme,
}