const db = require("./database");

const bcrypt = require("bcryptjs");

// POST /api/users/register
const registerUser = (req, res) => {
  const { name, email, role, password } = req.body;
  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(
    "INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)",
    [name, email, role, hashedPassword],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ message: "User registered", user: { id: this.lastID, name, email, role } });
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

// GET /api/users
const getUsers = (req, res) => {
  db.all("SELECT * FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};


module.exports = { registerUser, approveUser, uploadLicense, getUsers };




