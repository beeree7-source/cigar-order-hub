const express = require("express");
const { registerUser, approveUser, uploadLicense, getUsers } = require("./users");
const { createOrder, getOrders } = require("./orders");
const app = express();

const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Cigar Order Hub backend with SQLite is running" });
});

app.post("/api/users/register", registerUser);
app.post("/api/users/:id/approve", approveUser);
app.post("/api/users/:id/license", uploadLicense);
app.get("/api/users", getUsers);
app.post("/api/orders", createOrder);
app.get("/api/orders", getOrders);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});



