"use client";

import { useState, useEffect } from "react";

export default function Dashboard() {
  const [token, setToken] = useState("");
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(0);

  const apiCall = async (url: string, body?: any, isGet = false) => {
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const res = await fetch(`http://localhost:4000${url}`, {
      method: isGet ? "GET" : "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    return data;
  };

  const registerSupplier = async () => {
    await apiCall("/api/users/register", {
      name: "Test Supplier", 
      email: "supplier@test.com",
      role: "supplier",
      password: "password123"
    });
  };

  const login = async () => {
    const data = await apiCall("/api/auth/login", {
      email: "supplier@test.com",
      password: "password123"
    });
    if (data.token) setToken(data.token);
  };

  const loadUsers = async () => {
    const data = await apiCall("/api/protected/users", null, true);
    setUsers(data || []);
  };

  const loadOrders = async () => {
    const data = await apiCall("/api/protected/orders", null, true);
    setOrders(data || []);
  };

  const createOrder = async () => {
    await apiCall("/api/protected/orders", {
      retailerId: userId,
      product: "Cuban Cohiba",
      quantity: 50,
      price: 25.00
    });
    loadOrders();
  };

  useEffect(() => {
    if (token) {
      loadUsers();
      loadOrders();
    }
  }, [token]);

  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>🚬 Cigar Order Hub</h1>
      
      {!token ? (
        <div style={{ background: "#f0f8ff", padding: "2rem", borderRadius: "8px", margin: "2rem 0" }}>
          <h2>🔐 Login Required</h2>
          <button onClick={registerSupplier} style={{ padding: "1rem 2rem", marginRight: "1rem" }}>
            1. Register Supplier
          </button>
          <button onClick={login} style={{ padding: "1rem 2rem" }}>
            2. Login
          </button>
          <p style={{ marginTop: "1rem" }}>{message}</p>
        </div>
      ) : (
        <div>
          <div style={{ background: "#d4edda", padding: "1rem", borderRadius: "8px", marginBottom: "2rem" }}>
            ✅ Logged in | <button onClick={() => setToken("")}>Logout</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Users */}
            <div>
              <h3>👥 Users</h3>
              <button onClick={loadUsers}>Refresh</button>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Orders */}
            <div>
              <h3>📦 Orders</h3>
              <button onClick={loadOrders}>Refresh</button>
              <div style={{ margin: "1rem 0" }}>
                <input 
                  type="number" 
                  placeholder="Retailer ID" 
                  value={userId} 
                  onChange={(e) => setUserId(Number(e.target.value))}
                  style={{ padding: "0.5rem", marginRight: "1rem" }}
                />
                <button onClick={createOrder}>Create Order</button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr><th>ID</th><th>Retailer</th><th>Product</th><th>Qty</th><th>Price</th></tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.retailerId}</td>
                      <td>{order.product}</td>
                      <td>{order.quantity}</td>
                      <td>${order.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <p style={{ marginTop: "3rem", fontSize: "0.9rem", color: "#666" }}>
        Status: {message}
      </p>
    </main>
  );
}

// Add new state
const [trackingNumber, setTrackingNumber] = useState('');
const [trackingResult, setTrackingResult] = useState(null);

// Add these functions
const trackUSPS = async () => {
  const data = await apiCall('/api/shipping/track/usps', { trackingNumber });
  setTrackingResult(data);
};

const trackUPS = async () => {
  const data = await apiCall('/api/shipping/track/ups', { trackingNumber });
  setTrackingResult(data);
};

// Add this UI section (after Orders table)
<div style={{ marginTop: "3rem", padding: "2rem", background: "#fff3cd", borderRadius: "8px" }}>
  <h3>📦 Track Shipment</h3>
  <input 
    type="text" 
    placeholder="Tracking #" 
    value={trackingNumber}
    onChange={(e) => setTrackingNumber(e.target.value)}
    style={{ padding: "0.5rem", marginRight: "1rem", width: "300px" }}
  />
  <button onClick={trackUSPS} style={{ marginRight: "1rem" }}>USPS</button>
  <button onClick={trackUPS}>UPS</button>
  
  {trackingResult && (
    <div style={{ marginTop: "1rem", padding: "1rem", background: "white", borderRadius: "4px" }}>
      <strong>{trackingResult.carrier}:</strong> {trackingResult.status}
    </div>
  )}
</div>

const [products, setProducts] = useState([]);
const loadProducts = async (supplierId) => setProducts(await apiCall(`/api/products/supplier/${supplierId}`));
<button onClick={() => loadProducts(1)}>Load Supplier Products</button>
{products.map(p => <div>{p.name} - ${p.price}</div>)}
