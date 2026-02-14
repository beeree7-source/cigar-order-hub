const db = require("./database");

// POST /api/users/register
const registerUser = (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: "Missing name, email, or role" });
  }
  db.run(
    "INSERT INTO users (name, email, role) VALUES (?, ?, ?)",
    [name, email, role],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ message: "User registered", user: { id: this.lastID, name, email, role, approved: role === "supplier" } });
    }
  );
};

// POST /api/users/:id/approve
const approveUser = (req, res) => {
  const userId = req.params.id;
  db.run("UPDATE users SET approved = 1 WHERE id = ?", [userId], function(err) {
    if (err || this.changes === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User approved" });
  });
};

// POST /api/users/:id/license
const uploadLicense = (req, res) => {
  const userId = req.params.id;
  const { licenseNumber, expirationDate, fileName } = req.body;
  db.run(
    "INSERT INTO licenses (user_id, license_number, expiration_date, file_name) VALUES (?, ?, ?, ?)",
    [userId, licenseNumber, expirationDate, fileName],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ message: "License uploaded" });
    }
  );
};

module.exports = { registerUser, approveUser, uploadLicense };


