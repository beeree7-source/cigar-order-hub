"use client";

import { useState, useEffect } from "react";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(0);

  const apiCall = async (url: string, body?: any, isGet = false) => {
    const method = isGet ? "GET" : "POST";
    const res = await fetch(`http://localhost:4000${url}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    return data;
  };

  const loadUsers = async () => {
    const data = await apiCall("/api/users", null, true);
    setUsers(data);
  };

  const loadOrders = async () => {
    const data = await apiCall("/api/orders", null, true);
    setOrders(data);
  };

  return (
    <main>
      <h1>Cigar Order Hub Dashboard</h1>

      <div style={{ margin: "2rem 0" }}>
        <button onClick={() => apiCall("/api/users/register", { name: "Test Retailer", email: `retailer${Date.now()}@test.com`, role: "retailer" })}>
          1. Register Retailer
        </button>
      </div>

      <div style={{ margin: "2rem 0" }}>
        <input type="number" placeholder="User ID" value={userId} onChange={(e) => setUserId(Number(e.target.value))} style={{ marginRight: "1rem" }} />
        <button onClick={() => apiCall(`/api/users/${userId}/approve`)}>2. Approve</button>
        <button onClick={() => apiCall(`/api/users/${userId}/license`, { licenseNumber: "FL123", expirationDate: "2027-01-01", fileName: "license.pdf" })} style={{ marginLeft: "1rem" }}>
          3. License
        </button>
      </div>

      <div style={{ margin: "2rem 0" }}>
        <button onClick={() => apiCall("/api/orders", { retailerId: userId, supplierId: 999, items: [{ product: "Cohiba", qty: 10 }] })}>4. Place Order</button>
      </div>

      <div style={{ margin: "2rem 0" }}>
        <button onClick={loadUsers}>Load Users</button>
        <button onClick={loadOrders} style={{ marginLeft: "1rem" }}>Load Orders</button>
      </div>

      <p><strong>Status:</strong> {message}</p>

      <h2>Users ({users.length})</h2>
      <pre>{JSON.stringify(users, null, 2)}</pre>

      <h2>Orders ({orders.length})</h2>
      <pre>{JSON.stringify(orders, null, 2)}</pre>
    </main>
  );
}


