const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const db = require("../../Model/index.js");
const { updateProfileScheme } = require("../../validation/validAuth.js");

const User = db.user;
const UserProfile = db.userProfile;

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "email",
        "email_verified",
        "status",
        "role",
        "referral_code",
        "created_at",
        "updated_at",
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = await UserProfile.findOne({
      where: { user_id: userId },
    });

    return res.status(200).json({
      message: "Profile fetched successfully",
      data: {
        id: user.id,
        username: user.username || "",
        email: user.email || "",
        email_verified: user.email_verified,
        status: user.status,
        role: user.role,
        referral_code: user.referral_code || "",
        created_at: user.created_at,
        updated_at: user.updated_at,
        phone: profile?.phone || "",
        full_name: profile?.full_name || "",
        avatar_url: profile?.avatar_url || "",
      },
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateMyProfile = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const userId = req.user?.user_id;

    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error, value } = updateProfileScheme.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.message });
    }

    const user = await User.findByPk(userId, { transaction: t });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: "User not found" });
    }

    let profile = await UserProfile.findOne({
      where: { user_id: userId },
      transaction: t,
    });

    if (!profile) {
      profile = await UserProfile.create(
        {
          user_id: userId,
          full_name: null,
          phone: null,
          avatar_url: null,
        },
        { transaction: t }
      );
    }

    if (
      value.username &&
      value.username.trim() !== "" &&
      value.username !== user.username
    ) {
      const existingUsername = await User.findOne({
        where: {
          username: value.username,
          id: { [Op.ne]: userId },
        },
        transaction: t,
      });

      if (existingUsername) {
        await t.rollback();
        return res.status(400).json({ error: "Username already exists" });
      }

      user.username = value.username;
    }

    // ✅ full_name update
    if (Object.prototype.hasOwnProperty.call(value, "full_name")) {
      profile.full_name = value.full_name || null;
    }

    // ✅ phone update
    if (Object.prototype.hasOwnProperty.call(value, "phone")) {
      profile.phone = value.phone || null;
    }

    // ✅ avatar update
    if (Object.prototype.hasOwnProperty.call(value, "avatar_url")) {
      profile.avatar_url = value.avatar_url || null;
    }

    if (value.newPassword && value.newPassword.trim() !== "") {
      user.password_hash = await bcrypt.hash(value.newPassword, 10);
    }

    user.updated_at = new Date();

    await user.save({ transaction: t });
    await profile.save({ transaction: t });

    await t.commit();

    const freshProfile = await UserProfile.findOne({
      where: { user_id: userId },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      data: {
        id: user.id,
        username: user.username || "",
        email: user.email || "",
        email_verified: user.email_verified,
        status: user.status,
        role: user.role,
        referral_code: user.referral_code || "",
        created_at: user.created_at,
        updated_at: user.updated_at,
        phone: freshProfile?.phone || "",
        full_name: freshProfile?.full_name || "",
        avatar_url: freshProfile?.avatar_url || "",
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("Update Profile Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const changePassword = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const userId = req.user?.user_id;

    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error, value } = changePasswordScheme.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.message });
    }

    const user = await User.findOne({
      where: { id: userId },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(value.currentPassword, user.password_hash);

    if (!isMatch) {
      await t.rollback();
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const samePassword = await bcrypt.compare(value.newPassword, user.password_hash);

    if (samePassword) {
      await t.rollback();
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    const hashedPassword = await bcrypt.hash(value.newPassword, 10);

    user.password_hash = hashedPassword;
    user.updated_at = new Date();

    await user.save({ transaction: t });

    await t.commit();

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (err) {
    await t.rollback();
    console.error("Change Password Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
};