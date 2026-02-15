"use client";

import { useState, useEffect, useCallback } from "react";
import Toast, { ToastMessage } from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";
import Pagination from "./components/Pagination";

type TabType = "products" | "orders" | "users";

interface Product {
  id: number;
  supplierId: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl?: string;
  description?: string;
}

interface Order {
  id: number;
  retailer_id: number;
  supplier_id: number;
  items: any;
  status: string;
  created_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  approved: number;
  created_at: string;
}

export default function Dashboard() {
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    price: "",
    stock: "",
    description: "",
    imageUrl: "",
  });

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPage, setOrderPage] = useState(1);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
  });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "supplier@test.com",
    password: "password123",
  });

  const itemsPerPage = 5;

  const apiCall = async (url: string, method = "GET", body?: any) => {
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      return data;
    } catch (error: any) {
      throw new Error(error.message || "Network error");
    }
  };

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiCall("/api/auth/login", "POST", loginForm);
      if (data.token) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
        addToast("Login successful!", "success");
      }
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await apiCall("/api/users/register", "POST", {
        name: "Test Supplier",
        email: "supplier@test.com",
        role: "supplier",
        password: "password123",
      });
      addToast("Registration successful! Please login.", "success");
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setCurrentUser(null);
    localStorage.removeItem("token");
    addToast("Logged out successfully", "info");
  };

  // Load current user info
  const loadCurrentUser = async () => {
    try {
      const data = await apiCall("/api/protected/users", "GET");
      if (data && data.length > 0) {
        // Find the current user (for now, use the first one or match by email)
        const user = data.find((u: User) => u.email === loginForm.email) || data[0];
        setCurrentUser(user);
      }
    } catch (error: any) {
      console.error("Failed to load current user", error);
    }
  };

  // Products
  const loadProducts = async () => {
    setLoading(true);
    try {
      // Since we don't have a proper products endpoint, we'll simulate it
      // In real implementation, this would call /api/products with pagination
      const allProducts: Product[] = [];
      // Mock data for demonstration
      for (let i = 1; i <= 15; i++) {
        allProducts.push({
          id: i,
          supplierId: currentUser?.id || 1,
          name: `Product ${i}`,
          sku: `SKU-${1000 + i}`,
          price: 10 + i * 5,
          stock: Math.floor(Math.random() * 20),
          description: `Description for product ${i}`,
          imageUrl: "",
        });
      }
      setProducts(allProducts);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingProduct) {
        // Update product (not implemented in backend yet)
        addToast("Product update not implemented in backend yet", "error");
      } else {
        // Create product
        await apiCall("/api/products", "POST", {
          supplierId: currentUser?.id || 1,
          ...productForm,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock),
        });
        addToast("Product created successfully!", "success");
        setShowProductForm(false);
        setProductForm({ name: "", sku: "", price: "", stock: "", description: "", imageUrl: "" });
        loadProducts();
      }
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Product",
      message: "Are you sure you want to delete this product? This action cannot be undone.",
      onConfirm: async () => {
        setLoading(true);
        try {
          // Delete API not implemented yet
          addToast("Product delete not implemented in backend yet", "error");
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          addToast(error.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Orders
  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/api/protected/orders", "GET");
      setOrders(data || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    setLoading(true);
    try {
      // Update order status API not implemented yet
      addToast("Order status update not implemented in backend yet", "error");
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Order",
      message: "Are you sure you want to delete this order? This action cannot be undone.",
      onConfirm: async () => {
        setLoading(true);
        try {
          addToast("Order delete not implemented in backend yet", "error");
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          addToast(error.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/api/protected/users", "GET");
      setUsers(data || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        // Update user API not implemented yet
        addToast("User update not implemented in backend yet", "error");
      }
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: number, currentStatus: number) => {
    setLoading(true);
    try {
      if (currentStatus === 1) {
        // Unapprove - not implemented
        addToast("User unapprove not implemented in backend yet", "error");
      } else {
        await apiCall(`/api/protected/users/${userId}/approve`, "POST");
        addToast("User approved successfully!", "success");
        loadUsers();
      }
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      onConfirm: async () => {
        setLoading(true);
        try {
          addToast("User delete not implemented in backend yet", "error");
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          addToast(error.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Debounced search for products
  useEffect(() => {
    if (token && activeTab === "products") {
      const timer = setTimeout(() => {
        loadProducts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [productSearch, token, activeTab]);

  // Load data when tab changes
  useEffect(() => {
    if (token) {
      if (activeTab === "products") {
        loadProducts();
      } else if (activeTab === "orders") {
        loadOrders();
      } else if (activeTab === "users") {
        loadUsers();
      }
    }
  }, [activeTab, token]);

  // Load current user on login
  useEffect(() => {
    if (token) {
      loadCurrentUser();
    }
  }, [token]);

  // Check for saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Filter and paginate data
  const getFilteredProducts = () => {
    return products.filter((p) =>
      productSearch
        ? p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku.toLowerCase().includes(productSearch.toLowerCase())
        : true
    );
  };

  const getPaginatedProducts = () => {
    const filtered = getFilteredProducts();
    const start = (productPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  };

  const getFilteredOrders = () => {
    return orders.filter((o) =>
      orderStatusFilter === "all" ? true : o.status === orderStatusFilter
    );
  };

  const getPaginatedOrders = () => {
    const filtered = getFilteredOrders();
    const start = (orderPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  };

  const getFilteredUsers = () => {
    return users.filter((u) =>
      userRoleFilter === "all" ? true : u.role === userRoleFilter
    );
  };

  const getPaginatedUsers = () => {
    const filtered = getFilteredUsers();
    const start = (userPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  };

  const getStockClass = (stock: number) => {
    if (stock < 5) return "stock-low";
    if (stock < 10) return "stock-medium";
    return "stock-high";
  };

  if (!token) {
    return (
      <main>
        <div className="login-container">
          <div className="login-card">
            <h1 className="login-title">🚬 Cigar Order Hub</h1>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
                {loading ? <><span className="spinner"></span> Logging in...</> : "Login"}
              </button>
            </form>
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button onClick={handleRegister} className="btn btn-secondary" disabled={loading}>
                Register Test Account
              </button>
            </div>
          </div>
        </div>
        <Toast toasts={toasts} onRemove={removeToast} />
      </main>
    );
  }

  return (
    <main>
      <div className="header">
        <h1>🚬 Cigar Order Hub</h1>
        <div className="header-actions">
          <span style={{ color: "#64748b" }}>
            {currentUser?.name || "User"} ({currentUser?.role || "N/A"})
          </span>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          📦 Products
        </button>
        <button
          className={`tab ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          🛒 Orders
        </button>
        <button
          className={`tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Users
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Products Management</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowProductForm(!showProductForm);
                  setEditingProduct(null);
                  setProductForm({ name: "", sku: "", price: "", stock: "", description: "", imageUrl: "" });
                }}
              >
                {showProductForm ? "Cancel" : "+ Add Product"}
              </button>
            </div>

            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search by name or SKU..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(1);
                }}
              />
            </div>

            {showProductForm && (
              <form onSubmit={handleProductSubmit} style={{ marginBottom: "1.5rem" }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    type="url"
                    className="form-input"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? <><span className="spinner"></span> Saving...</> : editingProduct ? "Update Product" : "Create Product"}
                </button>
              </form>
            )}

            {loading ? (
              <div className="loading-overlay">
                <span className="spinner-large"></span> Loading products...
              </div>
            ) : getPaginatedProducts().length > 0 ? (
              <>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>SKU</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Supplier ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedProducts().map((product) => (
                        <tr key={product.id}>
                          <td>{product.id}</td>
                          <td>{product.name}</td>
                          <td>{product.sku}</td>
                          <td>${product.price.toFixed(2)}</td>
                          <td>
                            <span className={`stock-badge ${getStockClass(product.stock)}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td>{product.supplierId}</td>
                          <td>
                            <div className="actions">
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setProductForm({
                                    name: product.name,
                                    sku: product.sku,
                                    price: product.price.toString(),
                                    stock: product.stock.toString(),
                                    description: product.description || "",
                                    imageUrl: product.imageUrl || "",
                                  });
                                  setShowProductForm(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={productPage}
                  totalItems={getFilteredProducts().length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setProductPage}
                />
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <div className="empty-state-title">No products found</div>
                <div className="empty-state-description">
                  {productSearch ? "Try a different search term" : "Add your first product to get started"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Orders Management</h2>
            </div>

            <div className="search-container">
              <select
                className="filter-select"
                value={orderStatusFilter}
                onChange={(e) => {
                  setOrderStatusFilter(e.target.value);
                  setOrderPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            {loading ? (
              <div className="loading-overlay">
                <span className="spinner-large"></span> Loading orders...
              </div>
            ) : getPaginatedOrders().length > 0 ? (
              <>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Retailer ID</th>
                        <th>Supplier ID</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedOrders().map((order) => (
                        <tr key={order.id}>
                          <td>{order.id}</td>
                          <td>{order.retailer_id}</td>
                          <td>{order.supplier_id}</td>
                          <td>
                            <select
                              className={`status-badge status-${order.status}`}
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              style={{ border: "none", background: "transparent", cursor: "pointer" }}
                            >
                              <option value="pending">Pending</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </td>
                          <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={orderPage}
                  totalItems={getFilteredOrders().length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setOrderPage}
                />
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🛒</div>
                <div className="empty-state-title">No orders found</div>
                <div className="empty-state-description">
                  {orderStatusFilter !== "all" ? "Try a different filter" : "No orders have been created yet"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Users Management</h2>
            </div>

            <div className="search-container">
              <select
                className="filter-select"
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
              >
                <option value="all">All Roles</option>
                <option value="supplier">Supplier</option>
                <option value="retailer">Retailer</option>
              </select>
            </div>

            {loading ? (
              <div className="loading-overlay">
                <span className="spinner-large"></span> Loading users...
              </div>
            ) : getPaginatedUsers().length > 0 ? (
              <>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedUsers().map((user) => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`role-badge role-${user.role}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <span className={user.approved ? "text-green-600" : "text-red-600"}>
                              {user.approved ? "✅ Approved" : "❌ Not Approved"}
                            </span>
                          </td>
                          <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="actions">
                              <button
                                className={`btn btn-sm ${user.approved ? "btn-secondary" : "btn-success"}`}
                                onClick={() => handleApproveUser(user.id, user.approved)}
                              >
                                {user.approved ? "Unapprove" : "Approve"}
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={userPage}
                  totalItems={getFilteredUsers().length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setUserPage}
                />
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">No users found</div>
                <div className="empty-state-description">
                  {userRoleFilter !== "all" ? "Try a different filter" : "No users have been registered yet"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </main>
  );
}
