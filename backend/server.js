const express = require("express");
const { registerUser, approveUser, uploadLicense } = require("./users");
const app = express();

const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Cigar Order Hub backend is running" });
});

app.post("/api/users/register", registerUser);
app.post("/api/users/:id/approve", approveUser);
app.post("/api/users/:id/license", uploadLicense);
app.post("/api/orders", createOrder);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
