const express = require("express");
const { registerUser, approveUser, uploadLicense, getUsers } = require("./users");
const { createOrder, getOrders } = require("./orders");
const { authenticateToken, login } = require("./auth");
const app = express();

const PORT = process.env.PORT || 4000;

app.use(express.json());

// Public routes
app.get("/", (req, res) => {
  res.json({ message: "Cigar Order Hub with JWT auth & SQLite" });
});
app.post("/api/users/register", registerUser);
app.post("/api/auth/login", login);

// Protected routes (require JWT)
app.use("/api/protected", authenticateToken);
app.post("/api/protected/users/:id/approve", approveUser);
app.post("/api/protected/users/:id/license", uploadLicense);
app.get("/api/protected/users", getUsers);
app.post("/api/protected/orders", createOrder);
app.get("/api/protected/orders", getOrders);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

// auth routes
app.use('/api/shipping', shippingRoutes);
