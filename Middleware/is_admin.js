module.exports = (req, res, next) => {
  const role = req.user?.role || req.user?.data?.role;
  if (role !== "ADMIN") return res.status(403).json({ error: "Admin only" });
  next();
};