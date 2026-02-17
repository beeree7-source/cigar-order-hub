"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Toast, { ToastMessage } from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";
import Pagination from "./components/Pagination";
import WarehouseInventorySyncManager from "../lib/warehouse-sync";

type TabType = "products" | "orders" | "users" | "scheduling" | "hr" | "contracts" | "sales-rep" | "warehouse";

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
  business_name?: string;
  employee_role?: string;
  employee_id?: string;
  approved: number;
  created_at: string;
}

interface Shift {
  id: number;
  company_id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
  break_duration: number;
  lunch_duration: number;
  days_of_week: string[];
  is_recurring: boolean;
}

// Warehouse Interfaces
interface WarehouseLocation {
  id: number;
  location_code: string;
  aisle: string | null;
  shelf: string | null;
  position: string | null;
  zone: string;
  location_type: string;
  capacity: number;
  current_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductLocation {
  id: number;
  product_id: number;
  location_id: number;
  quantity: number;
  is_primary: boolean;
  last_counted: string;
  product_name?: string;
  product_sku?: string;
  location_code?: string;
  zone?: string;
}

interface InventoryScan {
  id: number;
  scan_type: string;
  user_id: number;
  product_id: number | null;
  upc_code: string;
  sku: string;
  location_id: number;
  quantity: number;
  status: string;
  error_message: string | null;
  session_id: string;
  metadata: string;
  scanned_at: string;
  product_name?: string;
  product_sku?: string;
  location_code?: string;
}

interface ReceivingShipment {
  id: number;
  shipment_number: string;
  supplier_id: number;
  po_number: string;
  carrier: string;
  tracking_number: string | null;
  status: string;
  expected_arrival: string;
  actual_arrival: string | null;
  total_items: number;
  items_received: number;
  received_by: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ReceivingItem {
  id: number;
  shipment_id: number;
  product_id: number;
  sku: string;
  expected_quantity: number;
  received_quantity: number;
  location_id: number | null;
  match_status: string;
  condition: string | null;
  notes: string;
  product_name?: string;
  product_sku?: string;
}

interface PickList {
  id: number;
  pick_list_number: string;
  order_id: number;
  assigned_to: number | null;
  priority: string;
  zone: string;
  status: string;
  total_items: number;
  items_picked: number;
  route_data: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PickListItem {
  id: number;
  pick_list_id: number;
  product_id: number;
  sku: string;
  location_id: number;
  quantity_requested: number;
  quantity_picked: number;
  sequence_number: number;
  status: string;
  notes: string;
  product_name?: string;
  product_sku?: string;
  location_code?: string;
}

interface WarehouseDashboard {
  kpis: {
    total_locations: number;
    total_inventory_items: number;
    scans_today: number;
    active_receiving: number;
    active_picking: number;
    pending_shipments: number;
    low_stock_items: number;
  };
  recent_scans: InventoryScan[];
  recent_activity: any[];
}

interface WarehouseLiveInventory {
  product_id: number;
  sku: string;
  name: string;
  upc?: string;
  available_quantity: number;
  locations: Array<{
    location_id: number;
    location_code: string;
    zone: string;
    quantity: number;
  }>;
  low_stock: boolean;
  last_updated: string;
}

interface Schedule {
  id: number;
  company_id: number;
  employee_id: number;
  shift_id: number;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  published: boolean;
  employee_name?: string;
  shift_name?: string;
}

interface TimeOffBalance {
  id: number;
  employee_id: number;
  company_id: number;
  leave_type: string;
  total_hours: number;
  used_hours: number;
  available_hours: number;
  accrual_rate: number;
  year: number;
  employee_name?: string;
}

interface TimeOffRequest {
  id: number;
  employee_id: number;
  company_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  reason: string;
  status: string;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  employee_name?: string;
  approver_name?: string;
}

interface Timesheet {
  id: number;
  employee_id: number;
  company_id: number;
  period_start_date: string;
  period_end_date: string;
  total_regular_hours: number;
  total_overtime_hours: number;
  absences: number;
  late_arrivals: number;
  status: string;
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  employee_name?: string;
  approver_name?: string;
}

interface Paystub {
  id: number;
  pay_period: string;
  payment_date: string;
  gross_pay: number;
  net_pay: number;
  status: string;
}

interface Contract {
  id: number;
  contract_number: string;
  supplier_id: number;
  retailer_id: number;
  title: string;
  content: string;
  contract_type: string;
  status: string;
  created_by: number;
  sent_at?: string;
  viewed_at?: string;
  signed_at?: string;
  pdf_path?: string;
  expires_at?: string;
  created_at: string;
  supplier_name?: string;
  retailer_name?: string;
}

interface ContractSignature {
  id: number;
  contract_id: number;
  signer_user_id: number;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  signature_type: string;
  signature_data: string;
  signed_at: string;
  ip_address?: string;
  signature_text?: string;
}

interface SupplierDocument {
  id: number;
  supplier_id: number;
  retailer_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: string;
  description: string;
  uploaded_by: number;
  created_at: string;
  uploaded_at?: string;
  supplier_name?: string;
  retailer_name?: string;
}

interface SalesRep {
  id: number;
  user_id: number;
  employee_id: string;
  territory: string;
  status: string;
}

interface DailyCheckIn {
  id: number;
  sales_rep_id: number;
  check_in_date: string;
  check_in_time: string;
  check_out_time: string | null;
  check_in_location: string;
  check_out_location: string | null;
  daily_miles: number | null;
  weather: string;
  status: string;
  notes: string;
}

interface AccountVisit {
  id: number;
  sales_rep_id: number;
  account_id: number;
  visit_date: string;
  scheduled_time?: string;
  arrival_time: string;
  check_in_time?: string;
  departure_time: string | null;
  check_out_time?: string | null;
  visit_duration: number | null;
  notes: string;
  purpose: string;
  status: string;
  account_name?: string;
  business_name?: string;
}

interface VisitPhoto {
  id: number;
  visit_id: number;
  account_id?: number;
  photo_url: string;
  file_name: string;
  file_size: number;
  photo_type: string;
  taken_at: string;
  visit_date?: string;
  account_name?: string;
}

interface MileageLog {
  id: number;
  sales_rep_id: number;
  trip_date: string;
  total_miles: number;
  purpose: string;
  notes: string;
  reimbursement_status: string;
  reimbursement_amount: number;
}

interface AuthorizedAccount {
  id: number;
  account_id: number;
  authorization_type: string;
  account_name: string;
  business_name: string;
  last_visit_date: string | null;
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

  // Scheduling state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftForm, setShiftForm] = useState({
    shift_name: "",
    start_time: "09:00",
    end_time: "17:00",
    break_duration: "30",
    lunch_duration: "30",
    days_of_week: [] as string[],
    is_recurring: true,
  });
  const [scheduleForm, setScheduleForm] = useState({
    employee_id: "",
    shift_id: "",
    scheduled_date: new Date().toISOString().split('T')[0],
    start_time: "09:00",
    end_time: "17:00",
  });

  // HR state
  const [hrView, setHrView] = useState<"time-off" | "timesheets" | "paystubs" | "reports">("time-off");
  const [timeOffBalances, setTimeOffBalances] = useState<TimeOffBalance[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [paystubs, setPaystubs] = useState<Paystub[]>([]);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [showTimesheetForm, setShowTimesheetForm] = useState(false);
  const [timeOffRequestFilter, setTimeOffRequestFilter] = useState("all");
  const [timesheetFilter, setTimesheetFilter] = useState("all");
  const [timeOffForm, setTimeOffForm] = useState({
    employee_id: "",
    leave_type: "vacation",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_hours: "8",
    reason: ""
  });
  const [timesheetForm, setTimesheetForm] = useState({
    employee_id: "",
    period_start_date: "",
    period_end_date: ""
  });

  // Contracts state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [accountDocuments, setAccountDocuments] = useState<SupplierDocument[]>([]);
  const [documentHistory, setDocumentHistory] = useState<any[]>([]);
  const [showDocumentHistory, setShowDocumentHistory] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [legalAgreement, setLegalAgreement] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractSignatures, setContractSignatures] = useState<ContractSignature[]>([]);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureType, setSignatureType] = useState<"draw" | "type" | "upload">("draw");
  const [signatureText, setSignatureText] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [contractView, setContractView] = useState<"contracts" | "documents" | "history">("contracts");
  const [contractForm, setContractForm] = useState({
    retailerId: 0,
    title: "",
    content: "",
    contractType: "sales",
    expiresAt: ""
  });

  // Sales Rep state
  const [currentSalesRep, setCurrentSalesRep] = useState<SalesRep | null>(null);
  const [salesRepView, setSalesRepView] = useState<"dashboard" | "visits" | "mileage" | "photos" | "performance">("dashboard");
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null);
  const [authorizedAccounts, setAuthorizedAccounts] = useState<AuthorizedAccount[]>([]);
  const [todayVisits, setTodayVisits] = useState<AccountVisit[]>([]);
  const [scheduledVisits, setScheduledVisits] = useState<AccountVisit[]>([]);
  const [activeVisit, setActiveVisit] = useState<AccountVisit | null>(null);
  const [visitPhotos, setVisitPhotos] = useState<VisitPhoto[]>([]);
  const [photoGallery, setPhotoGallery] = useState<VisitPhoto[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [todayMileageSummary, setTodayMileageSummary] = useState<any>(null);
  const [monthlyMileageSummary, setMonthlyMileageSummary] = useState<any>(null);
  const [performanceDashboard, setPerformanceDashboard] = useState<any>(null);
  const [weeklyPerformance, setWeeklyPerformance] = useState<any>(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showMileageForm, setShowMileageForm] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [visitForm, setVisitForm] = useState({
    account_id: 0,
    purpose: "Sales call",
    notes: ""
  });
  const [mileageForm, setMileageForm] = useState({
    total_miles: "",
    purpose: "Account visits",
    notes: "",
    start_odometer: "",
    end_odometer: ""
  });
  const [photoForm, setPhotoForm] = useState({
    visit_id: 0,
    photo_type: "display",
    file_name: ""
  });

  // Warehouse state
  const [warehouseView, setWarehouseView] = useState<"dashboard" | "locations" | "inventory" | "receiving" | "picking" | "reports">("dashboard");
  const [warehouseLocations, setWarehouseLocations] = useState<WarehouseLocation[]>([]);
  const [productLocations, setProductLocations] = useState<ProductLocation[]>([]);
  const [inventoryScans, setInventoryScans] = useState<InventoryScan[]>([]);
  const [receivingShipments, setReceivingShipments] = useState<ReceivingShipment[]>([]);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [pickListItems, setPickListItems] = useState<PickListItem[]>([]);
  const [warehouseDashboard, setWarehouseDashboard] = useState<WarehouseDashboard | null>(null);
  const [selectedReceivingShipment, setSelectedReceivingShipment] = useState<ReceivingShipment | null>(null);
  const [selectedPickList, setSelectedPickList] = useState<PickList | null>(null);
  const [selectedWarehouseLocation, setSelectedWarehouseLocation] = useState<WarehouseLocation | null>(null);
  const [liveInventory, setLiveInventory] = useState<Map<number, WarehouseLiveInventory>>(new Map());
  const [syncConnected, setSyncConnected] = useState(false);
  const [showScanForm, setShowScanForm] = useState(false);
  const [showReceivingForm, setShowReceivingForm] = useState(false);
  const [showPickListForm, setShowPickListForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [warehouseZoneFilter, setWarehouseZoneFilter] = useState("all");
  const [warehouseStatusFilter, setWarehouseStatusFilter] = useState("all");
  const [scanForm, setScanForm] = useState({
    scan_type: "cycle_count",
    sku: "",
    location_id: "",
    quantity: "1",
    session_id: `scan-${Date.now()}`
  });
  const [receivingForm, setReceivingForm] = useState({
    supplier_id: "",
    po_number: "",
    carrier: "",
    tracking_number: "",
    expected_arrival: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  });
  const [pickListForm, setPickListForm] = useState({
    order_id: "",
    assigned_to: "",
    priority: "normal",
    zone: "ZONE-A"
  });
  const [locationForm, setLocationForm] = useState({
    location_code: "",
    aisle: "",
    shelf: "",
    position: "",
    zone: "ZONE-A",
    location_type: "standard",
    capacity: "200"
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
    email: "john@example.com",
    password: "password123",
  });

  // WebSocket sync manager reference
  const syncManagerRef = useRef<WarehouseInventorySyncManager | null>(null);

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
        
        // Initialize WebSocket sync for live inventory
        const syncManager = new WarehouseInventorySyncManager((update: any) => {
          if (update.type === 'snapshot') {
            // Initial inventory snapshot
            const inventoryMap = new Map<number, WarehouseLiveInventory>();
            update.data.forEach((item: any) => {
              inventoryMap.set(item.product_id, item);
            });
            setLiveInventory(inventoryMap);
          } else if (update.type === 'single') {
            // Single product update
            setLiveInventory(prev => {
              const updated = new Map(prev);
              const current = updated.get(update.productId);
              if (current) {
                updated.set(update.productId, {
                  ...current,
                  available_quantity: update.quantity,
                  last_updated: new Date().toISOString()
                });
              }
              return updated;
            });
          } else if (update.type === 'batch') {
            // Batch update
            setLiveInventory(prev => {
              const updated = new Map(prev);
              update.updates.forEach((item: any) => {
                const current = updated.get(item.product_id);
                if (current) {
                  updated.set(item.product_id, {
                    ...current,
                    available_quantity: item.available_quantity,
                    last_updated: new Date().toISOString()
                  });
                }
              });
              return updated;
            });
          }
        });
        
        syncManagerRef.current = syncManager;
        syncManager.connect(data.user_id || 1, data.token);
        setSyncConnected(true);
        
        // Load live inventory
        await loadLiveInventory();
        
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
    // Disconnect WebSocket sync
    if (syncManagerRef.current) {
      syncManagerRef.current.disconnect();
      syncManagerRef.current = null;
    }
    setSyncConnected(false);
    
    setToken("");
    setCurrentUser(null);
    localStorage.removeItem("token");
    addToast("Logged out successfully", "info");
  };

  const handleOpenMessages = () => {
    if (currentUser?.role === "supplier" || currentUser?.role === "retailer") {
      window.location.assign('/messages');
      return;
    }

    addToast("Messaging is available for suppliers and retailers only.", "info");
  };

  const canOpenMessages = currentUser?.role === "supplier" || currentUser?.role === "retailer";

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
      const data = await apiCall("/api/products", "GET");
      setProducts(data.products || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Load live warehouse inventory
  const loadLiveInventory = async () => {
    try {
      const data = await apiCall("/api/warehouse/live-inventory", "GET");
      if (data && data.inventory) {
        const inventoryMap = new Map<number, WarehouseLiveInventory>();
        data.inventory.forEach((item: WarehouseLiveInventory) => {
          inventoryMap.set(item.product_id, item);
        });
        setLiveInventory(inventoryMap);
      }
    } catch (error: any) {
      console.error("Failed to load live inventory", error);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingProduct) {
        // Update product
        await apiCall(`/api/products/${editingProduct.id}`, "PUT", {
          ...productForm,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock),
        });
        addToast("Product updated successfully!", "success");
      } else {
        // Create product
        await apiCall("/api/products", "POST", {
          supplierId: currentUser?.id || 1,
          ...productForm,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock),
        });
        addToast("Product created successfully!", "success");
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ name: "", sku: "", price: "", stock: "", description: "", imageUrl: "" });
      loadProducts();
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
          await apiCall(`/api/products/${productId}`, "DELETE");
          addToast("Product deleted successfully!", "success");
          loadProducts();
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
      await apiCall(`/api/orders/${orderId}`, "PUT", { status: newStatus });
      addToast("Order status updated successfully!", "success");
      loadOrders();
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
          await apiCall(`/api/orders/${orderId}`, "DELETE");
          addToast("Order deleted successfully!", "success");
          loadOrders();
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
        await apiCall(`/api/users/${editingUser.id}`, "PUT", userForm);
        addToast("User updated successfully!", "success");
        setShowUserForm(false);
        setEditingUser(null);
        setUserForm({ name: "", email: "" });
        loadUsers();
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
          await apiCall(`/api/users/${userId}`, "DELETE");
          addToast("User deleted successfully!", "success");
          loadUsers();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          addToast(error.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Scheduling
  const loadShifts = async () => {
    setLoading(true);
    try {
      const companyId = currentUser?.id || 1;
      const data = await apiCall(`/api/shifts/${companyId}`, "GET");
      setShifts(data.shifts || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const companyId = currentUser?.id || 1;
      const data = await apiCall(`/api/schedules/${companyId}`, "GET");
      setSchedules(data.schedules || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklySchedules = async (date: string) => {
    setLoading(true);
    try {
      const companyId = currentUser?.id || 1;
      const data = await apiCall(`/api/schedules/weekly/${companyId}/${date}`, "GET");
      setSchedules(data.schedules || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const companyId = currentUser?.id || 1;
      if (editingShift) {
        await apiCall(`/api/shifts/${editingShift.id}`, "PUT", {
          ...shiftForm,
          break_duration: parseInt(shiftForm.break_duration),
          lunch_duration: parseInt(shiftForm.lunch_duration),
        });
        addToast("Shift updated successfully!", "success");
      } else {
        await apiCall("/api/shifts", "POST", {
          company_id: companyId,
          ...shiftForm,
          break_duration: parseInt(shiftForm.break_duration),
          lunch_duration: parseInt(shiftForm.lunch_duration),
        });
        addToast("Shift created successfully!", "success");
      }
      setShowShiftForm(false);
      setEditingShift(null);
      setShiftForm({
        shift_name: "",
        start_time: "09:00",
        end_time: "17:00",
        break_duration: "30",
        lunch_duration: "30",
        days_of_week: [],
        is_recurring: true,
      });
      loadShifts();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Shift",
      message: "Are you sure you want to delete this shift? This action cannot be undone.",
      onConfirm: async () => {
        setLoading(true);
        try {
          await apiCall(`/api/shifts/${shiftId}`, "DELETE");
          addToast("Shift deleted successfully!", "success");
          loadShifts();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          addToast(error.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const companyId = currentUser?.id || 1;
      if (editingSchedule) {
        await apiCall(`/api/schedules/${editingSchedule.id}`, "PUT", {
          ...scheduleForm,
          employee_id: parseInt(scheduleForm.employee_id),
          shift_id: parseInt(scheduleForm.shift_id),
        });
        addToast("Schedule updated successfully!", "success");
      } else {
        await apiCall("/api/schedules", "POST", {
          company_id: companyId,
          ...scheduleForm,
          employee_id: parseInt(scheduleForm.employee_id),
          shift_id: parseInt(scheduleForm.shift_id),
        });
        addToast("Schedule created successfully!", "success");
      }
      setShowScheduleForm(false);
      setEditingSchedule(null);
      setScheduleForm({
        employee_id: "",
        shift_id: "",
        scheduled_date: new Date().toISOString().split('T')[0],
        start_time: "09:00",
        end_time: "17:00",
      });
      loadSchedules();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Schedule",
      message: "Are you sure you want to cancel this schedule?",
      onConfirm: async () => {
        setLoading(true);
        try {
          await apiCall(`/api/schedules/${scheduleId}`, "DELETE");
          addToast("Schedule cancelled successfully!", "success");
          loadSchedules();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          addToast(error.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // HR - Time Off Management
  const loadTimeOffBalances = async (employeeId?: number) => {
    setLoading(true);
    try {
      const empId = employeeId || currentUser?.id || 1;
      const data = await apiCall(`/api/time-off/balance/${empId}`, "GET");
      setTimeOffBalances(data.balances || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadTimeOffRequests = async () => {
    setLoading(true);
    try {
      const companyId = currentUser?.id || 1;
      const data = await apiCall(`/api/time-off/requests/${companyId}`, "GET");
      setTimeOffRequests(data.requests || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const companyId = currentUser?.id || 1;
      await apiCall("/api/time-off/request", "POST", {
        company_id: companyId,
        employee_id: parseInt(timeOffForm.employee_id),
        leave_type: timeOffForm.leave_type,
        start_date: timeOffForm.start_date,
        end_date: timeOffForm.end_date,
        total_hours: parseInt(timeOffForm.total_hours),
        reason: timeOffForm.reason
      });
      addToast("Time off request submitted!", "success");
      setShowTimeOffForm(false);
      setTimeOffForm({
        employee_id: "",
        leave_type: "vacation",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        total_hours: "8",
        reason: ""
      });
      loadTimeOffRequests();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTimeOff = async (requestId: number) => {
    setLoading(true);
    try {
      await apiCall(`/api/time-off/requests/${requestId}/approve`, "PUT", {
        approver_id: currentUser?.id || 1
      });
      addToast("Time off request approved!", "success");
      loadTimeOffRequests();
      loadTimeOffBalances();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDenyTimeOff = async (requestId: number) => {
    setLoading(true);
    try {
      await apiCall(`/api/time-off/requests/${requestId}/deny`, "PUT", {
        approver_id: currentUser?.id || 1,
        denial_reason: "Request denied by manager"
      });
      addToast("Time off request denied", "info");
      loadTimeOffRequests();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // HR - Timesheet Management
  const loadTimesheets = async (employeeId?: number) => {
    setLoading(true);
    try {
      const empId = employeeId || currentUser?.id;
      const url = empId 
        ? `/api/timesheets/employee/${empId}` 
        : `/api/timesheets/pending-approval/${currentUser?.id || 1}`;
      const data = await apiCall(url, "GET");
      setTimesheets(data.timesheets || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTimesheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const companyId = currentUser?.id || 1;
      await apiCall("/api/timesheets/generate", "POST", {
        company_id: companyId,
        employee_id: parseInt(timesheetForm.employee_id),
        period_start_date: timesheetForm.period_start_date,
        period_end_date: timesheetForm.period_end_date
      });
      addToast("Timesheet generated!", "success");
      setShowTimesheetForm(false);
      setTimesheetForm({
        employee_id: "",
        period_start_date: "",
        period_end_date: ""
      });
      loadTimesheets();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTimesheet = async (timesheetId: number) => {
    setLoading(true);
    try {
      await apiCall(`/api/timesheets/${timesheetId}/submit`, "PUT", {});
      addToast("Timesheet submitted for approval!", "success");
      loadTimesheets();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTimesheet = async (timesheetId: number) => {
    setLoading(true);
    try {
      await apiCall(`/api/timesheets/${timesheetId}/approve`, "PUT", {
        approver_id: currentUser?.id || 1
      });
      addToast("Timesheet approved!", "success");
      loadTimesheets();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTimesheet = async (timesheetId: number) => {
    setLoading(true);
    try {
      await apiCall(`/api/timesheets/${timesheetId}/reject`, "PUT", {
        approver_id: currentUser?.id || 1,
        rejection_reason: "Please correct and resubmit"
      });
      addToast("Timesheet rejected", "info");
      loadTimesheets();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // HR - Paystubs
  const loadPaystubs = async (employeeId?: number) => {
    setLoading(true);
    try {
      const empId = employeeId || currentUser?.id || 2;
      const data = await apiCall(`/api/payroll/paystubs/${empId}`, "GET");
      setPaystubs(data.paystubs || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Contracts & Documents
  const loadContracts = async () => {
    setLoading(true);
    try {
      const supplierId = currentUser?.id || 1;
      const data = await apiCall(`/api/contracts/supplier/${supplierId}`, "GET");
      setContracts(data.contracts || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (supplierId?: number, retailerId?: number) => {
    setLoading(true);
    try {
      const supId = supplierId || currentUser?.id || 1;
      const retId = retailerId || 2; // Default to retailer 2 for demo
      const data = await apiCall(`/api/documents/supplier/${supId}/retailer/${retId}`, "GET");
      setDocuments(data.documents || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAccountDocuments = async () => {
    setLoading(true);
    try {
      const userId = currentUser?.id || 1;
      const data = await apiCall(`/api/documents/account/${userId}`, "GET");
      setAccountDocuments(data.documents || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentHistory = async (documentId: number) => {
    setLoading(true);
    try {
      const data = await apiCall(`/api/documents/${documentId}/history`, "GET");
      setDocumentHistory(data.history || []);
      setSelectedDocument(data.document);
      setShowDocumentHistory(true);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (documentId: number) => {
    try {
      const data = await apiCall(`/api/documents/${documentId}/download`, "GET");
      addToast(`Downloading ${data.document.filename}...`, "success");
    } catch (error: any) {
      addToast(error.message, "error");
    }
  };

  const handleContractSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      if (editingContract) {
        // Update contract (not implemented in mock API - would need PUT endpoint)
        addToast("Contract updated!", "success");
      } else {
        // Create new contract
        await apiCall("/api/contracts/create", "POST", {
          retailerId: Number(contractForm.retailerId),
          title: contractForm.title,
          content: contractForm.content,
          contractType: contractForm.contractType,
          expiresAt: contractForm.expiresAt || null
        });
        addToast("Contract created successfully!", "success");
      }
      setShowContractForm(false);
      setEditingContract(null);
      setContractForm({
        retailerId: 0,
        title: "",
        content: "",
        contractType: "sales",
        expiresAt: ""
      });
      loadContracts();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendContract = async (contractId: number) => {
    setLoading(true);
    try {
      await apiCall(`/api/contracts/${contractId}/send`, "POST", {});
      addToast("Contract sent to retailer!", "success");
      loadContracts();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewContract = async (contractId: number) => {
    setLoading(true);
    try {
      const data = await apiCall(`/api/contracts/${contractId}`, "GET");
      setSelectedContract(data.contract);
      setContractSignatures(data.signatures || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async (contractId: number) => {
    setLoading(true);
    try {
      let signatureData = "";
      
      if (signatureType === "draw") {
        signatureData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="; // Mock signature
      } else if (signatureType === "type") {
        signatureData = signatureText;
      } else {
        signatureData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="; // Mock upload
      }

      await apiCall(`/api/contracts/${contractId}/signature`, "POST", {
        signatureType,
        signatureData,
        signerName: currentUser?.name || "User",
        signerEmail: currentUser?.email || "user@example.com"
      });

      addToast("Contract signed successfully!", "success");
      setShowSignatureModal(false);
      setSelectedContract(null);
      loadContracts();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = async (contractId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Contract",
      message: "Are you sure you want to delete this contract? This action cannot be undone.",
      onConfirm: async () => {
        setLoading(true);
        try {
          await apiCall(`/api/contracts/${contractId}`, "DELETE");
          addToast("Contract deleted successfully!", "success");
          loadContracts();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          addToast(error.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDeleteDocument = async (documentId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Document",
      message: "Are you sure you want to delete this document?",
      onConfirm: async () => {
        setLoading(true);
        try {
          await apiCall(`/api/documents/${documentId}`, "DELETE");
          addToast("Document deleted successfully!", "success");
          loadDocuments();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          addToast(error.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // =============================================
  // SALES REP FUNCTIONS
  // =============================================

  const loadCurrentSalesRep = async () => {
    try {
      const data = await apiCall("/api/reps/me", "GET");
      setCurrentSalesRep(data.salesRep);
      return data.salesRep;
    } catch (error: any) {
      console.error("Failed to load sales rep profile:", error);
      return null;
    }
  };

  const loadSalesRepData = async () => {
    setLoading(true);
    try {
      // Get current sales rep first if not loaded
      const salesRep = currentSalesRep || await loadCurrentSalesRep();
      if (!salesRep) {
        addToast("No sales rep profile found for your account", "error");
        return;
      }
      
      const repId = salesRep.id;
      
      // Load check-in status
      const checkInData = await apiCall(`/api/reps/${repId}/check-in/today`, "GET");
      setTodayCheckIn(checkInData.check_in);
      
      // Load authorized accounts
      const accountsData = await apiCall(`/api/reps/${repId}/accounts`, "GET");
      setAuthorizedAccounts(accountsData.accounts || []);
      
      // Load today's visits
      const visitsData = await apiCall(`/api/reps/${repId}/visits/today`, "GET");
      setTodayVisits(visitsData.visits || []);
      
      // Load scheduled visits
      const scheduledData = await apiCall(`/api/reps/${repId}/visits/schedule`, "GET");
      setScheduledVisits(scheduledData.visits || []);
      
      // Load performance dashboard
      const dashboardData = await apiCall(`/api/reps/${repId}/performance/dashboard`, "GET");
      setPerformanceDashboard(dashboardData);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const salesRep = currentSalesRep || await loadCurrentSalesRep();
      if (!salesRep) {
        addToast("No sales rep profile found", "error");
        return;
      }
      
      await apiCall("/api/reps/check-in", "POST", {
        sales_rep_id: salesRep.id,
        check_in_location: "40.7128,-74.0060,Current Location",
        notes: "Starting my route",
        weather: "Clear, 72°F"
      });
      addToast("Checked in successfully!", "success");
      loadSalesRepData();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayCheckIn) return;
    
    setLoading(true);
    try {
      await apiCall("/api/reps/check-out", "POST", {
        check_in_id: todayCheckIn.id,
        check_out_location: "40.7128,-74.0060,Current Location",
        daily_miles: 45.5
      });
      addToast("Checked out successfully!", "success");
      loadSalesRepData();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVisitCheckIn = async () => {
    if (!visitForm.account_id || !todayCheckIn) {
      addToast("Please select an account and check in for the day first", "error");
      return;
    }
    
    setLoading(true);
    try {
      const salesRep = currentSalesRep || await loadCurrentSalesRep();
      if (!salesRep) {
        addToast("No sales rep profile found", "error");
        return;
      }
      
      await apiCall("/api/reps/visits/check-in", "POST", {
        sales_rep_id: salesRep.id,
        account_id: visitForm.account_id,
        check_in_id: todayCheckIn.id,
        location_latitude: 40.7589,
        location_longitude: -73.9851,
        purpose: visitForm.purpose,
        notes: visitForm.notes
      });
      addToast("Checked in to account!", "success");
      setShowVisitForm(false);
      setVisitForm({ account_id: 0, purpose: "Sales call", notes: "" });
      loadSalesRepData();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVisitCheckOut = async (visitId: number) => {
    setLoading(true);
    try {
      await apiCall("/api/reps/visits/check-out", "POST", {
        visit_id: visitId,
        notes: "Visit completed"
      });
      addToast("Checked out from visit!", "success");
      loadSalesRepData();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMileageData = async () => {
    setLoading(true);
    try {
      const salesRep = currentSalesRep || await loadCurrentSalesRep();
      if (!salesRep) return;
      
      const repId = salesRep.id;
      
      const todayData = await apiCall(`/api/reps/${repId}/mileage/today`, "GET");
      setMileageLogs(todayData.logs || []);
      setTodayMileageSummary(todayData.summary);
      
      const monthData = await apiCall(`/api/reps/${repId}/mileage/month`, "GET");
      setMonthlyMileageSummary(monthData.summary);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogMileage = async () => {
    if (!mileageForm.total_miles) {
      addToast("Please enter total miles", "error");
      return;
    }
    
    setLoading(true);
    try {
      const salesRep = currentSalesRep || await loadCurrentSalesRep();
      if (!salesRep) {
        addToast("No sales rep profile found", "error");
        return;
      }
      
      await apiCall("/api/reps/mileage/log", "POST", {
        sales_rep_id: salesRep.id,
        check_in_id: todayCheckIn?.id,
        total_miles: parseFloat(mileageForm.total_miles),
        purpose: mileageForm.purpose,
        notes: mileageForm.notes,
        start_odometer: mileageForm.start_odometer ? parseInt(mileageForm.start_odometer) : null,
        end_odometer: mileageForm.end_odometer ? parseInt(mileageForm.end_odometer) : null
      });
      addToast("Mileage logged successfully!", "success");
      setShowMileageForm(false);
      setMileageForm({ total_miles: "", purpose: "Account visits", notes: "", start_odometer: "", end_odometer: "" });
      loadMileageData();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoGallery = async () => {
    setLoading(true);
    try {
      const salesRep = currentSalesRep || await loadCurrentSalesRep();
      if (!salesRep) return;
      
      const data = await apiCall(`/api/reps/${salesRep.id}/photos/gallery`, "GET");
      setPhotoGallery(data.photos || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoForm.visit_id) {
      addToast("Please select a visit", "error");
      return;
    }
    
    setLoading(true);
    try {
      await apiCall("/api/reps/photos/upload", "POST", {
        visit_id: photoForm.visit_id,
        file_name: photoForm.file_name || "photo.jpg",
        file_size: 2458624,
        photo_type: photoForm.photo_type,
        photo_metadata: {
          camera: "Mobile Camera",
          timestamp: new Date().toISOString()
        }
      });
      addToast("Photo uploaded successfully!", "success");
      setShowPhotoUpload(false);
      setPhotoForm({ visit_id: 0, photo_type: "display", file_name: "" });
      loadPhotoGallery();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const salesRep = currentSalesRep || await loadCurrentSalesRep();
      if (!salesRep) return;
      
      const weeklyData = await apiCall(`/api/reps/${salesRep.id}/performance/weekly`, "GET");
      setWeeklyPerformance(weeklyData);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // WAREHOUSE FUNCTIONS
  // =============================================

  const loadWarehouseDashboard = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/api/warehouse/dashboard", "GET");
      setWarehouseDashboard(data);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouseLocations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (warehouseZoneFilter !== "all") params.append("zone", warehouseZoneFilter);
      
      const data = await apiCall(`/api/warehouse/locations?${params.toString()}`, "GET");
      setWarehouseLocations(data.locations || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (warehouseZoneFilter !== "all") params.append("zone", warehouseZoneFilter);
      
      const data = await apiCall(`/api/warehouse/inventory?${params.toString()}`, "GET");
      setProductLocations(data.inventory || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadReceivingShipments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (warehouseStatusFilter !== "all") params.append("status", warehouseStatusFilter);
      
      const data = await apiCall(`/api/warehouse/receiving/shipments?${params.toString()}`, "GET");
      setReceivingShipments(data.shipments || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadReceivingShipmentDetails = async (shipmentId: number) => {
    setLoading(true);
    try {
      const data = await apiCall(`/api/warehouse/receiving/shipments/${shipmentId}`, "GET");
      setSelectedReceivingShipment(data.shipment);
      setReceivingItems(data.items || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPickLists = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (warehouseStatusFilter !== "all") params.append("status", warehouseStatusFilter);
      
      const data = await apiCall(`/api/warehouse/pick-lists?${params.toString()}`, "GET");
      setPickLists(data.pick_lists || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPickListDetails = async (pickListId: number) => {
    setLoading(true);
    try {
      const data = await apiCall(`/api/warehouse/pick-lists/${pickListId}`, "GET");
      setSelectedPickList(data.pick_list);
      setPickListItems(data.items || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadScanHistory = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/api/warehouse/scan-history?limit=20", "GET");
      setInventoryScans(data.scans || []);
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseScan = async () => {
    if (!scanForm.sku || !scanForm.location_id) {
      addToast("SKU and location are required", "error");
      return;
    }
    
    setLoading(true);
    try {
      const data = await apiCall("/api/warehouse/scan", "POST", {
        scan_type: scanForm.scan_type,
        sku: scanForm.sku,
        location_id: parseInt(scanForm.location_id),
        quantity: parseInt(scanForm.quantity),
        session_id: scanForm.session_id
      });
      
      addToast(`Scanned successfully: ${data.product.name}`, "success");
      setShowScanForm(false);
      setScanForm({
        scan_type: "cycle_count",
        sku: "",
        location_id: "",
        quantity: "1",
        session_id: `scan-${Date.now()}`
      });
      
      // Reload appropriate data based on current view
      if (warehouseView === "dashboard") {
        loadWarehouseDashboard();
      } else if (warehouseView === "inventory") {
        loadInventory();
      }
      loadScanHistory();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePickList = async () => {
    if (!pickListForm.order_id) {
      addToast("Order ID is required", "error");
      return;
    }
    
    setLoading(true);
    try {
      const data = await apiCall("/api/warehouse/pick-lists", "POST", {
        order_id: parseInt(pickListForm.order_id),
        assigned_to: pickListForm.assigned_to ? parseInt(pickListForm.assigned_to) : null,
        priority: pickListForm.priority,
        zone: pickListForm.zone
      });
      
      addToast(`Pick list created: ${data.pick_list.pick_list_number}`, "success");
      setShowPickListForm(false);
      setPickListForm({
        order_id: "",
        assigned_to: "",
        priority: "normal",
        zone: "ZONE-A"
      });
      loadPickLists();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!locationForm.location_code || !locationForm.zone) {
      addToast("Location code and zone are required", "error");
      return;
    }
    
    setLoading(true);
    try {
      const data = await apiCall("/api/warehouse/locations", "POST", {
        location_code: locationForm.location_code,
        aisle: locationForm.aisle || null,
        shelf: locationForm.shelf || null,
        position: locationForm.position || null,
        zone: locationForm.zone,
        location_type: locationForm.location_type,
        capacity: parseInt(locationForm.capacity)
      });
      
      addToast(`Location created: ${data.location.location_code}`, "success");
      setShowLocationForm(false);
      setLocationForm({
        location_code: "",
        aisle: "",
        shelf: "",
        position: "",
        zone: "ZONE-A",
        location_type: "standard",
        capacity: "200"
      });
      loadWarehouseLocations();
    } catch (error: any) {
      addToast(error.message, "error");
    } finally {
      setLoading(false);
    }
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
  // Load scheduling data
  useEffect(() => {
    if (token && activeTab === "scheduling") {
      loadShifts();
      loadSchedules();
    }
  }, [token, activeTab]);

  // Load HR data
  useEffect(() => {
    if (token && activeTab === "hr") {
      if (hrView === "time-off") {
        loadTimeOffBalances();
        loadTimeOffRequests();
      } else if (hrView === "timesheets") {
        loadTimesheets();
      } else if (hrView === "paystubs") {
        loadPaystubs();
      }
    }
  }, [token, activeTab, hrView]);

  // Load contracts data
  useEffect(() => {
    if (token && activeTab === "contracts") {
      if (contractView === "contracts") {
        loadContracts();
      } else if (contractView === "documents") {
        loadAccountDocuments();
      } else if (contractView === "history") {
        loadAccountDocuments();
      }
    }
  }, [token, activeTab, contractView]);

  // Load sales rep data
  useEffect(() => {
    if (token && activeTab === "sales-rep") {
      // Load sales rep profile first if not loaded
      if (!currentSalesRep) {
        loadCurrentSalesRep();
      }
      
      if (salesRepView === "dashboard") {
        loadSalesRepData();
      } else if (salesRepView === "visits") {
        loadSalesRepData();
      } else if (salesRepView === "mileage") {
        loadMileageData();
      } else if (salesRepView === "photos") {
        loadPhotoGallery();
      } else if (salesRepView === "performance") {
        loadPerformanceData();
      }
    }
  }, [token, activeTab, salesRepView]);

  // Load warehouse data
  useEffect(() => {
    if (token && activeTab === "warehouse") {
      if (warehouseView === "dashboard") {
        loadWarehouseDashboard();
        loadScanHistory();
      } else if (warehouseView === "locations") {
        loadWarehouseLocations();
      } else if (warehouseView === "inventory") {
        loadInventory();
      } else if (warehouseView === "receiving") {
        loadReceivingShipments();
      } else if (warehouseView === "picking") {
        loadPickLists();
      } else if (warehouseView === "reports") {
        loadScanHistory();
      }
    }
  }, [token, activeTab, warehouseView, warehouseZoneFilter, warehouseStatusFilter]);

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
          <button
            onClick={handleOpenMessages}
            className="btn btn-primary"
            disabled={!canOpenMessages}
            title={canOpenMessages ? "Open Messages" : "Messaging is available for suppliers and retailers only"}
          >
            Messages
          </button>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => window.location.assign('/admin/quickbooks')}
              className="btn btn-primary"
              title="Open QuickBooks"
            >
              QuickBooks
            </button>
          )}
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
        <button
          className={`tab ${activeTab === "scheduling" ? "active" : ""}`}
          onClick={() => setActiveTab("scheduling")}
        >
          📅 Scheduling
        </button>
        <button
          className={`tab ${activeTab === "hr" ? "active" : ""}`}
          onClick={() => setActiveTab("hr")}
        >
          👔 HR & Payroll
        </button>
        <button
          className={`tab ${activeTab === "contracts" ? "active" : ""}`}
          onClick={() => setActiveTab("contracts")}
        >
          📄 Contracts
        </button>
        <button
          className={`tab ${activeTab === "sales-rep" ? "active" : ""}`}
          onClick={() => setActiveTab("sales-rep")}
        >
          🚗 Field Sales
        </button>
        <button
          className={`tab ${activeTab === "warehouse" ? "active" : ""}`}
          onClick={() => setActiveTab("warehouse")}
        >
          📦 Warehouse
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
                <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem", color: "#666" }}>
                    {syncConnected ? (
                      <>
                        <span style={{ color: "#28a745" }}>● </span>Live Inventory Sync Active
                      </>
                    ) : (
                      <>
                        <span style={{ color: "#dc3545" }}>● </span>Sync Connecting...
                      </>
                    )}
                  </span>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>SKU</th>
                        <th>Price</th>
                        <th>Warehouse Stock</th>
                        <th>Product Table</th>
                        <th>Supplier ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedProducts().map((product) => {
                        const warehouseInventory = liveInventory.get(product.id);
                        const warehouseQty = warehouseInventory?.available_quantity || 0;
                        return (
                          <tr key={product.id}>
                            <td>{product.id}</td>
                            <td>{product.name}</td>
                            <td>{product.sku}</td>
                            <td>${product.price.toFixed(2)}</td>
                            <td>
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.25rem 0.75rem",
                                backgroundColor: warehouseQty > 100 ? "#d4edda" : warehouseQty > 50 ? "#fff3cd" : "#f8d7da",
                                color: warehouseQty > 100 ? "#155724" : warehouseQty > 50 ? "#856404" : "#721c24",
                                borderRadius: "4px",
                                fontWeight: "bold"
                              }}>
                                {warehouseQty}
                                {warehouseInventory && <span>📦</span>}
                              </span>
                            </td>
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
                        );
                      })}
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

      {/* Scheduling Tab */}
      {activeTab === "scheduling" && (
        <div>
          {/* Shifts Management */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div className="card-header">
              <h2 className="card-title">📋 Shifts Management</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowShiftForm(!showShiftForm);
                  setEditingShift(null);
                  setShiftForm({
                    shift_name: "",
                    start_time: "09:00",
                    end_time: "17:00",
                    break_duration: "30",
                    lunch_duration: "30",
                    days_of_week: [],
                    is_recurring: true,
                  });
                }}
              >
                {showShiftForm ? "Cancel" : "+ Add Shift"}
              </button>
            </div>

            {showShiftForm && (
              <form onSubmit={handleShiftSubmit} style={{ marginBottom: "2rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Shift Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={shiftForm.shift_name}
                      onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recurring</label>
                    <select
                      className="form-input"
                      value={shiftForm.is_recurring.toString()}
                      onChange={(e) => setShiftForm({ ...shiftForm, is_recurring: e.target.value === "true" })}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Break Duration (minutes)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={shiftForm.break_duration}
                      onChange={(e) => setShiftForm({ ...shiftForm, break_duration: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lunch Duration (minutes)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={shiftForm.lunch_duration}
                      onChange={(e) => setShiftForm({ ...shiftForm, lunch_duration: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label className="form-label">Days of Week</label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                      <label key={day} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <input
                          type="checkbox"
                          checked={shiftForm.days_of_week.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setShiftForm({ ...shiftForm, days_of_week: [...shiftForm.days_of_week, day] });
                            } else {
                              setShiftForm({ ...shiftForm, days_of_week: shiftForm.days_of_week.filter((d) => d !== day) });
                            }
                          }}
                        />
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-success" disabled={loading} style={{ marginTop: "1rem" }}>
                  {loading ? <><span className="spinner"></span> Saving...</> : editingShift ? "Update Shift" : "Create Shift"}
                </button>
              </form>
            )}

            {loading ? (
              <div className="loading-overlay">
                <span className="spinner-large"></span> Loading shifts...
              </div>
            ) : shifts.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Shift Name</th>
                      <th>Time</th>
                      <th>Breaks</th>
                      <th>Days</th>
                      <th>Recurring</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => (
                      <tr key={shift.id}>
                        <td><strong>{shift.shift_name}</strong></td>
                        <td>{shift.start_time} - {shift.end_time}</td>
                        <td>Break: {shift.break_duration}m | Lunch: {shift.lunch_duration}m</td>
                        <td>
                          <div style={{ fontSize: "0.875rem" }}>
                            {shift.days_of_week.map((d) => d.slice(0, 3).toUpperCase()).join(", ")}
                          </div>
                        </td>
                        <td>{shift.is_recurring ? "✅ Yes" : "❌ No"}</td>
                        <td>
                          <div className="actions">
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                setEditingShift(shift);
                                setShiftForm({
                                  shift_name: shift.shift_name,
                                  start_time: shift.start_time,
                                  end_time: shift.end_time,
                                  break_duration: shift.break_duration.toString(),
                                  lunch_duration: shift.lunch_duration.toString(),
                                  days_of_week: shift.days_of_week,
                                  is_recurring: shift.is_recurring,
                                });
                                setShowShiftForm(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteShift(shift.id)}
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
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No shifts found</div>
                <div className="empty-state-description">Create your first shift to get started</div>
              </div>
            )}
          </div>

          {/* Schedules Management */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📅 Employee Schedules</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowScheduleForm(!showScheduleForm);
                  setEditingSchedule(null);
                  setScheduleForm({
                    employee_id: "",
                    shift_id: "",
                    scheduled_date: new Date().toISOString().split('T')[0],
                    start_time: "09:00",
                    end_time: "17:00",
                  });
                }}
              >
                {showScheduleForm ? "Cancel" : "+ Schedule Employee"}
              </button>
            </div>

            {showScheduleForm && (
              <form onSubmit={handleScheduleSubmit} style={{ marginBottom: "2rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Employee</label>
                    <select
                      className="form-input"
                      value={scheduleForm.employee_id}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, employee_id: e.target.value })}
                      required
                    >
                      <option value="">Select Employee</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shift</label>
                    <select
                      className="form-input"
                      value={scheduleForm.shift_id}
                      onChange={(e) => {
                        const selectedShift = shifts.find((s) => s.id === parseInt(e.target.value));
                        setScheduleForm({
                          ...scheduleForm,
                          shift_id: e.target.value,
                          start_time: selectedShift?.start_time || "09:00",
                          end_time: selectedShift?.end_time || "17:00",
                        });
                      }}
                      required
                    >
                      <option value="">Select Shift</option>
                      {shifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.shift_name} ({shift.start_time} - {shift.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={scheduleForm.scheduled_date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={scheduleForm.start_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={scheduleForm.end_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-success" disabled={loading} style={{ marginTop: "1rem" }}>
                  {loading ? <><span className="spinner"></span> Saving...</> : editingSchedule ? "Update Schedule" : "Create Schedule"}
                </button>
              </form>
            )}

            {/* Weekly Calendar Filter */}
            <div className="search-container" style={{ marginBottom: "1rem" }}>
              <label className="form-label" style={{ marginRight: "0.5rem" }}>📆 View Week:</label>
              <input
                type="date"
                className="form-input"
                style={{ width: "200px", display: "inline-block" }}
                value={selectedWeekDate}
                onChange={(e) => {
                  setSelectedWeekDate(e.target.value);
                  loadWeeklySchedules(e.target.value);
                }}
              />
              <button
                className="btn btn-secondary"
                style={{ marginLeft: "0.5rem" }}
                onClick={() => loadSchedules()}
              >
                View All
              </button>
            </div>

            {loading ? (
              <div className="loading-overlay">
                <span className="spinner-large"></span> Loading schedules...
              </div>
            ) : schedules.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Published</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => {
                      const employee = users.find((u) => u.id === schedule.employee_id);
                      const shift = shifts.find((s) => s.id === schedule.shift_id);
                      return (
                        <tr key={schedule.id}>
                          <td><strong>{employee?.name || `Employee #${schedule.employee_id}`}</strong></td>
                          <td>{new Date(schedule.scheduled_date).toLocaleDateString()}</td>
                          <td>{shift?.shift_name || `Shift #${schedule.shift_id}`}</td>
                          <td>{schedule.start_time} - {schedule.end_time}</td>
                          <td>
                            <span className={`role-badge ${schedule.status === "confirmed" ? "role-supplier" : schedule.status === "cancelled" ? "role-retailer" : ""}`}>
                              {schedule.status}
                            </span>
                          </td>
                          <td>{schedule.published ? "✅ Yes" : "❌ No"}</td>
                          <td>
                            <div className="actions">
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setEditingSchedule(schedule);
                                  setScheduleForm({
                                    employee_id: schedule.employee_id.toString(),
                                    shift_id: schedule.shift_id.toString(),
                                    scheduled_date: schedule.scheduled_date,
                                    start_time: schedule.start_time,
                                    end_time: schedule.end_time,
                                  });
                                  setShowScheduleForm(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-title">No schedules found</div>
                <div className="empty-state-description">Create your first schedule to assign employees to shifts</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HR & Payroll Tab */}
      {activeTab === "hr" && (
        <div>
          {/* HR Sub-Navigation */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", padding: "1rem" }}>
              <button
                className={`btn ${hrView === "time-off" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHrView("time-off")}
              >
                ⏰ Time Off
              </button>
              <button
                className={`btn ${hrView === "timesheets" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHrView("timesheets")}
              >
                📋 Timesheets
              </button>
              <button
                className={`btn ${hrView === "paystubs" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHrView("paystubs")}
              >
                💰 Paystubs
              </button>
              <button
                className={`btn ${hrView === "reports" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHrView("reports")}
              >
                📊 Reports
              </button>
            </div>
          </div>

          {/* Time Off View */}
          {hrView === "time-off" && (
            <>
              {/* Time Off Balances */}
              <div className="card" style={{ marginBottom: "2rem" }}>
                <div className="card-header">
                  <h2 className="card-title">⏰ Time Off Balances</h2>
                  <button
                    className="btn btn-primary"
                    onClick={() => loadTimeOffBalances()}
                  >
                    Refresh
                  </button>
                </div>
                {loading ? (
                  <div className="loading-overlay">
                    <span className="spinner-large"></span> Loading balances...
                  </div>
                ) : timeOffBalances.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Leave Type</th>
                          <th>Total Hours</th>
                          <th>Used Hours</th>
                          <th>Available Hours</th>
                          <th>Accrual Rate</th>
                          <th>Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeOffBalances.map((balance) => (
                          <tr key={balance.id}>
                            <td><strong>{balance.employee_name || `Employee #${balance.employee_id}`}</strong></td>
                            <td>
                              <span className={`role-badge role-${balance.leave_type === 'vacation' ? 'supplier' : 'retailer'}`}>
                                {balance.leave_type}
                              </span>
                            </td>
                            <td>{balance.total_hours}h</td>
                            <td>{balance.used_hours}h</td>
                            <td><strong>{balance.available_hours}h</strong></td>
                            <td>{balance.accrual_rate}h/month</td>
                            <td>{balance.year}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">⏰</div>
                    <div className="empty-state-title">No time off balances found</div>
                  </div>
                )}
              </div>

              {/* Time Off Requests */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">📝 Time Off Requests</h2>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setShowTimeOffForm(!showTimeOffForm);
                      setTimeOffForm({
                        employee_id: "",
                        leave_type: "vacation",
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date().toISOString().split('T')[0],
                        total_hours: "8",
                        reason: ""
                      });
                    }}
                  >
                    {showTimeOffForm ? "Cancel" : "+ Request Time Off"}
                  </button>
                </div>

                {showTimeOffForm && (
                  <form onSubmit={handleTimeOffSubmit} style={{ marginBottom: "2rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="form-group">
                        <label className="form-label">Employee</label>
                        <select
                          className="form-input"
                          value={timeOffForm.employee_id}
                          onChange={(e) => setTimeOffForm({ ...timeOffForm, employee_id: e.target.value })}
                          required
                        >
                          <option value="">Select Employee</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Leave Type</label>
                        <select
                          className="form-input"
                          value={timeOffForm.leave_type}
                          onChange={(e) => setTimeOffForm({ ...timeOffForm, leave_type: e.target.value })}
                          required
                        >
                          <option value="vacation">Vacation</option>
                          <option value="sick">Sick Leave</option>
                          <option value="personal">Personal</option>
                          <option value="bereavement">Bereavement</option>
                          <option value="jury_duty">Jury Duty</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={timeOffForm.start_date}
                          onChange={(e) => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">End Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={timeOffForm.end_date}
                          onChange={(e) => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total Hours</label>
                        <input
                          type="number"
                          className="form-input"
                          value={timeOffForm.total_hours}
                          onChange={(e) => setTimeOffForm({ ...timeOffForm, total_hours: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Reason</label>
                        <input
                          type="text"
                          className="form-input"
                          value={timeOffForm.reason}
                          onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-success" disabled={loading} style={{ marginTop: "1rem" }}>
                      {loading ? <><span className="spinner"></span> Submitting...</> : "Submit Request"}
                    </button>
                  </form>
                )}

                <div className="search-container">
                  <select
                    className="filter-select"
                    value={timeOffRequestFilter}
                    onChange={(e) => setTimeOffRequestFilter(e.target.value)}
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>

                {loading ? (
                  <div className="loading-overlay">
                    <span className="spinner-large"></span> Loading requests...
                  </div>
                ) : timeOffRequests.filter(r => timeOffRequestFilter === 'all' || r.status === timeOffRequestFilter).length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Type</th>
                          <th>Dates</th>
                          <th>Hours</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeOffRequests
                          .filter(r => timeOffRequestFilter === 'all' || r.status === timeOffRequestFilter)
                          .map((request) => (
                            <tr key={request.id}>
                              <td><strong>{request.employee_name || `Employee #${request.employee_id}`}</strong></td>
                              <td>{request.leave_type}</td>
                              <td>{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</td>
                              <td>{request.total_hours}h</td>
                              <td>{request.reason || '-'}</td>
                              <td>
                                <span className={`role-badge ${request.status === 'approved' ? 'role-supplier' : request.status === 'denied' ? 'role-retailer' : ''}`}>
                                  {request.status}
                                </span>
                              </td>
                              <td>
                                {request.status === 'pending' && (
                                  <div className="actions">
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => handleApproveTimeOff(request.id)}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="btn btn-sm btn-danger"
                                      onClick={() => handleDenyTimeOff(request.id)}
                                    >
                                      Deny
                                    </button>
                                  </div>
                                )}
                                {request.status !== 'pending' && (
                                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    {request.status === 'approved' ? '✅ Approved' : '❌ Denied'} by {request.approver_name || 'Manager'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <div className="empty-state-title">No time off requests found</div>
                    <div className="empty-state-description">Submit a new request to get started</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Timesheets View */}
          {hrView === "timesheets" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📋 Employee Timesheets</h2>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowTimesheetForm(!showTimesheetForm);
                    setTimesheetForm({
                      employee_id: "",
                      period_start_date: "",
                      period_end_date: ""
                    });
                  }}
                >
                  {showTimesheetForm ? "Cancel" : "+ Generate Timesheet"}
                </button>
              </div>

              {showTimesheetForm && (
                <form onSubmit={handleTimesheetSubmit} style={{ marginBottom: "2rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Employee</label>
                      <select
                        className="form-input"
                        value={timesheetForm.employee_id}
                        onChange={(e) => setTimesheetForm({ ...timesheetForm, employee_id: e.target.value })}
                        required
                      >
                        <option value="">Select Employee</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Period Start Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={timesheetForm.period_start_date}
                        onChange={(e) => setTimesheetForm({ ...timesheetForm, period_start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Period End Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={timesheetForm.period_end_date}
                        onChange={(e) => setTimesheetForm({ ...timesheetForm, period_end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-success" disabled={loading} style={{ marginTop: "1rem" }}>
                    {loading ? <><span className="spinner"></span> Generating...</> : "Generate Timesheet"}
                  </button>
                </form>
              )}

              <div className="search-container">
                <select
                  className="filter-select"
                  value={timesheetFilter}
                  onChange={(e) => setTimesheetFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {loading ? (
                <div className="loading-overlay">
                  <span className="spinner-large"></span> Loading timesheets...
                </div>
              ) : timesheets.filter(t => timesheetFilter === 'all' || t.status === timesheetFilter).length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Period</th>
                        <th>Regular Hours</th>
                        <th>Overtime Hours</th>
                        <th>Absences</th>
                        <th>Late Arrivals</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timesheets
                        .filter(t => timesheetFilter === 'all' || t.status === timesheetFilter)
                        .map((timesheet) => (
                          <tr key={timesheet.id}>
                            <td><strong>{timesheet.employee_name || `Employee #${timesheet.employee_id}`}</strong></td>
                            <td>
                              {new Date(timesheet.period_start_date).toLocaleDateString()} - {new Date(timesheet.period_end_date).toLocaleDateString()}
                            </td>
                            <td>{timesheet.total_regular_hours}h</td>
                            <td>{timesheet.total_overtime_hours}h</td>
                            <td>{timesheet.absences}</td>
                            <td>{timesheet.late_arrivals}</td>
                            <td>
                              <span className={`role-badge ${timesheet.status === 'approved' ? 'role-supplier' : timesheet.status === 'rejected' ? 'role-retailer' : ''}`}>
                                {timesheet.status}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                {timesheet.status === 'draft' && (
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleSubmitTimesheet(timesheet.id)}
                                  >
                                    Submit
                                  </button>
                                )}
                                {timesheet.status === 'submitted' && (
                                  <>
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => handleApproveTimesheet(timesheet.id)}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="btn btn-sm btn-danger"
                                      onClick={() => handleRejectTimesheet(timesheet.id)}
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {(timesheet.status === 'approved' || timesheet.status === 'rejected') && (
                                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                                    by {timesheet.approver_name || 'Manager'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">No timesheets found</div>
                  <div className="empty-state-description">Generate a timesheet to get started</div>
                </div>
              )}
            </div>
          )}

          {/* Paystubs View */}
          {hrView === "paystubs" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">💰 Employee Paystubs</h2>
                <button
                  className="btn btn-primary"
                  onClick={() => loadPaystubs()}
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="loading-overlay">
                  <span className="spinner-large"></span> Loading paystubs...
                </div>
              ) : paystubs.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Pay Period</th>
                        <th>Payment Date</th>
                        <th>Gross Pay</th>
                        <th>Net Pay</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paystubs.map((paystub) => (
                        <tr key={paystub.id}>
                          <td>{new Date(paystub.pay_period).toLocaleDateString()}</td>
                          <td>{new Date(paystub.payment_date).toLocaleDateString()}</td>
                          <td><strong>${paystub.gross_pay.toFixed(2)}</strong></td>
                          <td><strong style={{ color: "#10b981" }}>${paystub.net_pay.toFixed(2)}</strong></td>
                          <td>
                            <span className={`role-badge ${paystub.status === 'paid' ? 'role-supplier' : ''}`}>
                              {paystub.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={async () => {
                                try {
                                  const data = await apiCall(`/api/payroll/paystub/${paystub.id}`, "GET");
                                  alert(`Paystub Details:\n\nGross Pay: $${data.paystub.gross_pay}\nNet Pay: $${data.paystub.net_pay}\n\nDeductions:\nFederal Tax: $${data.paystub.deductions.federal_tax}\nState Tax: $${data.paystub.deductions.state_tax}\nSocial Security: $${data.paystub.deductions.social_security}\nMedicare: $${data.paystub.deductions.medicare}`);
                                } catch (error: any) {
                                  addToast(error.message, "error");
                                }
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">💰</div>
                  <div className="empty-state-title">No paystubs found</div>
                  <div className="empty-state-description">Paystubs will appear after payroll processing</div>
                </div>
              )}
            </div>
          )}

          {/* Reports View */}
          {hrView === "reports" && (
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div className="card-header">
                  <h2 className="card-title">📊 HR Reports & Analytics</h2>
                </div>
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
                  <h3>Reports Dashboard</h3>
                  <p style={{ color: "#64748b", marginTop: "0.5rem" }}>
                    Available reports: Labor Cost, Productivity, Overtime Analysis, Attendance Summary, Compliance, and more
                  </p>
                  <div style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          const data = await apiCall(`/api/reports/labor-cost/${currentUser?.id || 1}`, "GET");
                          alert(`Labor Cost Report:\n\nTotal Payroll: $${data.report.total_payroll}\nTotal Hours: ${data.report.total_hours}\nAverage Hourly Cost: $${data.report.average_hourly_cost}\nEmployee Count: ${data.report.employee_count}`);
                        } catch (error: any) {
                          addToast(error.message, "error");
                        }
                      }}
                    >
                      💵 Labor Cost
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          const data = await apiCall(`/api/reports/overtime-analysis/${currentUser?.id || 1}`, "GET");
                          alert(`Overtime Analysis:\n\nTotal OT Hours: ${data.report.total_overtime_hours}\nTotal OT Cost: $${data.report.total_overtime_cost}\nEmployees with OT: ${data.report.employees_with_overtime}\nAverage OT per Employee: ${data.report.average_overtime_per_employee}h`);
                        } catch (error: any) {
                          addToast(error.message, "error");
                        }
                      }}
                    >
                      ⏰ Overtime Analysis
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          const data = await apiCall(`/api/reports/attendance-summary/${currentUser?.id || 1}`, "GET");
                          alert(`Attendance Summary:\n\nTotal Absences: ${data.report.total_absences}\nTotal Late Arrivals: ${data.report.total_late_arrivals}\nAttendance Rate: ${data.report.attendance_rate}%`);
                        } catch (error: any) {
                          addToast(error.message, "error");
                        }
                      }}
                    >
                      📅 Attendance
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          const data = await apiCall(`/api/reports/compliance/${currentUser?.id || 1}`, "GET");
                          alert(`Compliance Report:\n\nBreak Violations: ${data.report.break_violations}\nOvertime Violations: ${data.report.overtime_violations}\nMinimum Wage Compliance: ${data.report.minimum_wage_compliance}%\nOverall Compliance Score: ${data.report.overall_compliance_score}%`);
                        } catch (error: any) {
                          addToast(error.message, "error");
                        }
                      }}
                    >
                      ✅ Compliance
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contracts Tab */}
      {activeTab === "contracts" && (
        <div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>📄 Contract & Document Management</h2>
            <p>Manage digital contracts, documents, and e-signatures with full history tracking</p>
          </div>

          {/* Sub-Navigation */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", padding: "1rem" }}>
              <button
                className={`btn ${contractView === "contracts" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setContractView("contracts")}
              >
                📋 Contracts
              </button>
              <button
                className={`btn ${contractView === "documents" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setContractView("documents")}
              >
                📄 My Documents
              </button>
              <button
                className={`btn ${contractView === "history" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setContractView("history")}
              >
                📊 Activity History
              </button>
            </div>
          </div>

          {/* Contracts View */}
          {contractView === "contracts" && (
            <div>
              {/* Action Buttons */}
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setContractForm({
                        retailerId: 0,
                        title: "",
                        content: "",
                        contractType: "sales",
                        expiresAt: "",
                      });
                      setEditingContract(null);
                      setShowContractForm(true);
                    }}
                  >
                    ➕ Create Contract
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowDocumentUpload(true)}
                  >
                    📤 Upload Document
                  </button>
                  <select
                    value={contractStatusFilter}
                    onChange={(e) => setContractStatusFilter(e.target.value)}
                    className="form-input"
                    style={{ maxWidth: "200px" }}
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="signed">Signed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Contracts List */}
              <div className="card">
                <h3>Your Contracts</h3>
                {contracts.filter(c => !contractStatusFilter || c.status === contractStatusFilter).length === 0 ? (
                  <p>No contracts found. Create your first contract to get started.</p>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {contracts
                      .filter(c => !contractStatusFilter || c.status === contractStatusFilter)
                      .map((contract) => (
                        <div
                          key={contract.id}
                          className="card"
                          style={{ border: "1px solid #ddd" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                <h4 style={{ margin: 0 }}>{contract.title}</h4>
                                <span
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                    backgroundColor:
                                      contract.status === "completed"
                                        ? "#28a745"
                                        : contract.status === "signed"
                                        ? "#17a2b8"
                                        : contract.status === "viewed"
                                        ? "#ffc107"
                                        : contract.status === "sent"
                                        ? "#007bff"
                                        : "#6c757d",
                                    color: contract.status === "viewed" ? "#000" : "#fff",
                                  }}
                                >
                                  {contract.status.toUpperCase()}
                                </span>
                              </div>
                              <p style={{ margin: "0.5rem 0", color: "#666" }}>
                                Contract #{contract.contract_number} · {contract.contract_type}
                              </p>
                              <p style={{ margin: "0.5rem 0", color: "#666" }}>
                                Retailer: {contract.retailer_name || "Unknown"}
                              </p>
                              <p style={{ margin: "0.5rem 0", fontSize: "0.875rem", color: "#888" }}>
                                Created: {new Date(contract.created_at).toLocaleDateString()}
                                {contract.expires_at && ` · Expires: ${new Date(contract.expires_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleViewContract(contract.id)}
                              >
                                👁️ View
                              </button>
                              {contract.status === "draft" && (
                                <>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => handleSendContract(contract.id)}
                                  >
                                    📤 Send
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                      setEditingContract(contract);
                                      setContractForm({
                                        retailerId: contract.retailer_id,
                                        title: contract.title,
                                        content: contract.content,
                                        contractType: contract.contract_type,
                                        expiresAt: contract.expires_at?.split('T')[0] || "",
                                      });
                                      setShowContractForm(true);
                                    }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => handleDeleteContract(contract.id)}
                                  >
                                    🗑️ Delete
                                  </button>
                                </>
                              )}
                              {(contract.status === "sent" || contract.status === "viewed") &&
                                currentUser?.role === "retailer" && (
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                      setSelectedContract(contract);
                                      setShowSignatureModal(true);
                                    }}
                                  >
                                    ✍️ Sign
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My Documents View */}
          {contractView === "documents" && (
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowDocumentUpload(true)}
                  >
                    📤 Upload Document
                  </button>
                  <select
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="form-input"
                    style={{ maxWidth: "200px" }}
                  >
                    <option value="">All Types</option>
                    <option value="contract">Contract</option>
                    <option value="invoice">Invoice</option>
                    <option value="catalog">Catalog</option>
                    <option value="compliance">Compliance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="card">
                <h3>My Document Library</h3>
                <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
                  All documents stored for your account ({currentUser?.role})
                </p>
                {accountDocuments.filter(d => !documentTypeFilter || d.document_type === documentTypeFilter).length === 0 ? (
                  <p>No documents uploaded yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {accountDocuments
                      .filter(d => !documentTypeFilter || d.document_type === documentTypeFilter)
                      .map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.75rem",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <strong>{doc.filename || doc.original_filename}</strong>
                              <span
                                style={{
                                  padding: "0.125rem 0.5rem",
                                  borderRadius: "4px",
                                  fontSize: "0.7rem",
                                  backgroundColor: "#e9ecef",
                                  color: "#495057",
                                }}
                              >
                                {doc.document_type}
                              </span>
                            </div>
                            <p style={{ margin: "0.25rem 0", fontSize: "0.875rem", color: "#666" }}>
                              {currentUser?.role === "supplier" ? `Retailer: ${doc.retailer_name}` : `Supplier: ${doc.supplier_name}`}
                            </p>
                            <p style={{ margin: "0.25rem 0", fontSize: "0.875rem", color: "#666" }}>
                              Size: {((doc.file_size || 0) / 1024).toFixed(1)} KB · 
                              Uploaded: {new Date(doc.created_at || doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleDownloadDocument(doc.id)}
                              title="Download"
                            >
                              📥
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => loadDocumentHistory(doc.id)}
                              title="View History"
                            >
                              📊
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDeleteDocument(doc.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity History View */}
          {contractView === "history" && (
            <div>
              <div className="card">
                <h3>📊 Document Activity History</h3>
                <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
                  Complete audit trail of all document activities for your account
                </p>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {accountDocuments.length === 0 ? (
                    <p>No activity history to display.</p>
                  ) : (
                    accountDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onClick={() => loadDocumentHistory(doc.id)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong>{doc.filename || doc.original_filename}</strong>
                            <p style={{ margin: "0.25rem 0", fontSize: "0.875rem", color: "#666" }}>
                              {doc.document_type} · Uploaded: {new Date(doc.created_at || doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button className="btn btn-secondary">
                            View History →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Document History Modal */}
          {showDocumentHistory && selectedDocument && (
            <div className="modal-overlay" onClick={() => setShowDocumentHistory(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
                <h3>📊 Document History</h3>
                <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                  <p><strong>File:</strong> {selectedDocument.filename}</p>
                  <p><strong>Type:</strong> {selectedDocument.document_type}</p>
                  <p><strong>Uploaded:</strong> {new Date(selectedDocument.uploaded_at).toLocaleString()}</p>
                </div>

                <h4>Activity Timeline</h4>
                {documentHistory.length === 0 ? (
                  <p>No activity recorded for this document.</p>
                ) : (
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {documentHistory.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: "0.75rem",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          borderLeft: `4px solid ${
                            log.action === "upload" ? "#007bff" :
                            log.action === "download" ? "#28a745" :
                            log.action === "view" ? "#ffc107" :
                            log.action === "delete" ? "#dc3545" :
                            "#6c757d"
                          }`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                              <strong style={{ textTransform: "capitalize" }}>
                                {log.action === "upload" ? "📤 Uploaded" :
                                 log.action === "download" ? "📥 Downloaded" :
                                 log.action === "view" ? "👁️ Viewed" :
                                 log.action === "delete" ? "🗑️ Deleted" :
                                 log.action}
                              </strong>
                              <span style={{ fontSize: "0.875rem", color: "#666" }}>
                                by {log.user_name} ({log.user_email})
                              </span>
                            </div>
                            <p style={{ margin: "0.25rem 0", fontSize: "0.875rem", color: "#888" }}>
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                            <p style={{ margin: "0.25rem 0", fontSize: "0.75rem", color: "#aaa" }}>
                              IP: {log.ip_address}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDocumentHistory(false);
                      setSelectedDocument(null);
                      setDocumentHistory([]);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create/Edit Contract Form Modal */}
          {showContractForm && (
            <div className="modal-overlay" onClick={() => setShowContractForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>{editingContract ? "Edit Contract" : "Create New Contract"}</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleContractSubmit(e);
                  }}
                >
                  <div className="form-group">
                    <label>Retailer *</label>
                    <select
                      className="form-input"
                      value={contractForm.retailerId}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, retailerId: parseInt(e.target.value) })
                      }
                      required
                    >
                      <option value={0}>Select Retailer</option>
                      {users
                        .filter((u) => u.role === "retailer")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} - {u.business_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Contract Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contractForm.title}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, title: e.target.value })
                      }
                      placeholder="e.g., Annual Supply Agreement 2026"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contract Type *</label>
                    <select
                      className="form-input"
                      value={contractForm.contractType}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, contractType: e.target.value })
                      }
                      required
                    >
                      <option value="sales">Sales Agreement</option>
                      <option value="service">Service Agreement</option>
                      <option value="nda">Non-Disclosure Agreement</option>
                      <option value="partnership">Partnership Agreement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Contract Content *</label>
                    <textarea
                      className="form-input"
                      value={contractForm.content}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, content: e.target.value })
                      }
                      placeholder="Enter the full contract terms and conditions..."
                      rows={10}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Expiration Date (Optional)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={contractForm.expiresAt}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, expiresAt: e.target.value })
                      }
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowContractForm(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingContract ? "💾 Update Contract" : "✅ Save as Draft"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Document Upload Modal */}
          {showDocumentUpload && (
            <div className="modal-overlay" onClick={() => setShowContractForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>{editingContract ? "Edit Contract" : "Create New Contract"}</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleContractSubmit();
                  }}
                >
                  <div className="form-group">
                    <label>Retailer *</label>
                    <select
                      className="form-input"
                      value={contractForm.retailerId}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, retailerId: parseInt(e.target.value) })
                      }
                      required
                    >
                      <option value={0}>Select Retailer</option>
                      {users
                        .filter((u) => u.role === "retailer")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} - {u.business_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Contract Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contractForm.title}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, title: e.target.value })
                      }
                      placeholder="e.g., Annual Supply Agreement 2026"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contract Type *</label>
                    <select
                      className="form-input"
                      value={contractForm.contractType}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, contractType: e.target.value })
                      }
                      required
                    >
                      <option value="sales">Sales Agreement</option>
                      <option value="service">Service Agreement</option>
                      <option value="nda">Non-Disclosure Agreement</option>
                      <option value="partnership">Partnership Agreement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Contract Content *</label>
                    <textarea
                      className="form-input"
                      value={contractForm.content}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, content: e.target.value })
                      }
                      placeholder="Enter the full contract terms and conditions..."
                      rows={10}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Expiration Date (Optional)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={contractForm.expiresAt}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, expiresAt: e.target.value })
                      }
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowContractForm(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingContract ? "💾 Update Contract" : "✅ Save as Draft"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Document Upload Modal */}
          {showDocumentUpload && (
            <div className="modal-overlay" onClick={() => setShowDocumentUpload(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>📤 Upload Document</h3>
                <div className="form-group">
                  <label>Document Type</label>
                  <select
                    className="form-input"
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                  >
                    <option value="contract">Contract</option>
                    <option value="invoice">Invoice</option>
                    <option value="catalog">Product Catalog</option>
                    <option value="compliance">Compliance Certificate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Select File</label>
                  <input type="file" className="form-input" accept=".pdf,.doc,.docx,.jpg,.png" />
                </div>
                <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "1rem" }}>
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </p>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowDocumentUpload(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      addToast("Document uploaded successfully!", "success");
                      setShowDocumentUpload(false);
                      loadDocuments();
                    }}
                  >
                    📤 Upload
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contract Viewer Modal */}
          {selectedContract && !showSignatureModal && (
            <div className="modal-overlay" onClick={() => setSelectedContract(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
                <h3>📄 {selectedContract.title}</h3>
                <div style={{ marginBottom: "1rem" }}>
                  <p>
                    <strong>Contract Number:</strong> {selectedContract.contract_number}
                  </p>
                  <p>
                    <strong>Type:</strong> {selectedContract.contract_type}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        backgroundColor:
                          selectedContract.status === "completed"
                            ? "#28a745"
                            : selectedContract.status === "signed"
                            ? "#17a2b8"
                            : selectedContract.status === "viewed"
                            ? "#ffc107"
                            : selectedContract.status === "sent"
                            ? "#007bff"
                            : "#6c757d",
                        color: selectedContract.status === "viewed" ? "#000" : "#fff",
                      }}
                    >
                      {selectedContract.status.toUpperCase()}
                    </span>
                  </p>
                  <p>
                    <strong>Retailer:</strong> {selectedContract.retailer_name}
                  </p>
                  <p>
                    <strong>Created:</strong> {new Date(selectedContract.created_at).toLocaleDateString()}
                  </p>
                  {selectedContract.expires_at && (
                    <p>
                      <strong>Expires:</strong> {new Date(selectedContract.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px", marginBottom: "1rem" }}>
                  <h4>Contract Terms:</h4>
                  <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.875rem" }}>
                    {selectedContract.content}
                  </div>
                </div>

                {/* Signatures Section */}
                {contractSignatures.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <h4>Signatures:</h4>
                    {contractSignatures.map((sig) => (
                      <div
                        key={sig.id}
                        style={{
                          padding: "1rem",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <p>
                          <strong>Signed by:</strong> {sig.signer_name}
                        </p>
                        <p>
                          <strong>Date:</strong> {new Date(sig.signed_at).toLocaleString()}
                        </p>
                        <p>
                          <strong>IP Address:</strong> {sig.ip_address}
                        </p>
                        {sig.signature_type === "type" && sig.signature_text && (
                          <div style={{ fontFamily: "cursive", fontSize: "1.5rem", marginTop: "0.5rem" }}>
                            {sig.signature_text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  {(selectedContract.status === "sent" || selectedContract.status === "viewed") &&
                    currentUser?.role === "retailer" && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setShowSignatureModal(true);
                        }}
                      >
                        ✍️ Sign Contract
                      </button>
                    )}
                  <button className="btn btn-secondary" onClick={() => setSelectedContract(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Signature Modal */}
          {showSignatureModal && selectedContract && (
            <div className="modal-overlay" onClick={() => setShowSignatureModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>✍️ Sign Contract</h3>
                <p>
                  <strong>{selectedContract.title}</strong>
                </p>
                <p style={{ fontSize: "0.875rem", color: "#666" }}>
                  Contract #{selectedContract.contract_number}
                </p>

                <div className="form-group" style={{ marginTop: "1.5rem" }}>
                  <label>Signature Type</label>
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="radio"
                        name="signatureType"
                        value="draw"
                        checked={signatureType === "draw"}
                        onChange={(e) => setSignatureType(e.target.value as "draw" | "type" | "upload")}
                      />
                      Draw
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="radio"
                        name="signatureType"
                        value="type"
                        checked={signatureType === "type"}
                        onChange={(e) => setSignatureType(e.target.value as "draw" | "type" | "upload")}
                      />
                      Type
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="radio"
                        name="signatureType"
                        value="upload"
                        checked={signatureType === "upload"}
                        onChange={(e) => setSignatureType(e.target.value as "draw" | "type" | "upload")}
                      />
                      Upload
                    </label>
                  </div>
                </div>

                {signatureType === "draw" && (
                  <div
                    style={{
                      border: "2px solid #007bff",
                      borderRadius: "4px",
                      padding: "3rem",
                      textAlign: "center",
                      backgroundColor: "#f8f9fa",
                      marginTop: "1rem",
                    }}
                  >
                    <p style={{ color: "#666" }}>✍️ Draw your signature here</p>
                    <p style={{ fontSize: "0.75rem", color: "#888" }}>
                      (Canvas placeholder - signature pad would appear here)
                    </p>
                  </div>
                )}

                {signatureType === "type" && (
                  <div className="form-group" style={{ marginTop: "1rem" }}>
                    <label>Type Your Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                      placeholder="John Doe"
                      style={{ fontFamily: "cursive", fontSize: "1.5rem" }}
                    />
                  </div>
                )}

                {signatureType === "upload" && (
                  <div className="form-group" style={{ marginTop: "1rem" }}>
                    <label>Upload Signature Image</label>
                    <input type="file" className="form-input" accept="image/*" />
                    <p style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.5rem" }}>
                      Accepted: JPG, PNG (Max 2MB)
                    </p>
                  </div>
                )}

                <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "4px" }}>
                  <label style={{ display: "flex", alignItems: "start", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={legalAgreement}
                      onChange={(e) => setLegalAgreement(e.target.checked)}
                      style={{ marginTop: "0.25rem" }}
                    />
                    <span style={{ fontSize: "0.875rem" }}>
                      I agree that by signing this contract electronically, I am legally bound by its terms and
                      conditions. This electronic signature has the same legal effect as a handwritten signature.
                    </span>
                  </label>
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowSignatureModal(false);
                      setSignatureType("draw");
                      setSignatureText("");
                      setLegalAgreement(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSignContract(selectedContract.id)}
                    disabled={!legalAgreement || (signatureType === "type" && !signatureText)}
                  >
                    ✅ Accept & Sign
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field Sales Rep Tab */}
      {activeTab === "sales-rep" && (
        <div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>🚗 Field Sales Representative</h2>
            <p>Daily check-ins, account visits, mileage tracking, photo documentation, and performance analytics</p>
          </div>

          {/* Sub-Navigation */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", padding: "1rem", flexWrap: "wrap" }}>
              <button
                className={`btn ${salesRepView === "dashboard" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSalesRepView("dashboard")}
              >
                📊 Dashboard
              </button>
              <button
                className={`btn ${salesRepView === "visits" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSalesRepView("visits")}
              >
                🏪 Visits
              </button>
              <button
                className={`btn ${salesRepView === "mileage" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSalesRepView("mileage")}
              >
                🚙 Mileage
              </button>
              <button
                className={`btn ${salesRepView === "photos" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSalesRepView("photos")}
              >
                📷 Photos
              </button>
              <button
                className={`btn ${salesRepView === "performance" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSalesRepView("performance")}
              >
                📈 Performance
              </button>
            </div>
          </div>

          {/* Dashboard View */}
          {salesRepView === "dashboard" && (
            <div>
              {/* Check-In Status Card */}
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h3>📍 Daily Check-In Status</h3>
                {todayCheckIn ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                      <div style={{ padding: "1rem", backgroundColor: "#e7f5ff", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Status</div>
                        <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "0.25rem" }}>
                          {todayCheckIn.status === "checked_in" ? "✅ Checked In" : "🏁 Checked Out"}
                        </div>
                      </div>
                      <div style={{ padding: "1rem", backgroundColor: "#fff3e0", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Check-In Time</div>
                        <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "0.25rem" }}>
                          {new Date(todayCheckIn.check_in_time).toLocaleTimeString()}
                        </div>
                      </div>
                      <div style={{ padding: "1rem", backgroundColor: "#f3e5f5", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Location</div>
                        <div style={{ fontSize: "1rem", fontWeight: "bold", marginTop: "0.25rem" }}>
                          {todayCheckIn.check_in_location?.split(',')[2] || "Current Location"}
                        </div>
                      </div>
                      <div style={{ padding: "1rem", backgroundColor: "#e8f5e9", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Weather</div>
                        <div style={{ fontSize: "1rem", fontWeight: "bold", marginTop: "0.25rem" }}>
                          {todayCheckIn.weather || "N/A"}
                        </div>
                      </div>
                    </div>
                    {todayCheckIn.status === "checked_in" ? (
                      <button
                        className="btn btn-danger"
                        onClick={handleCheckOut}
                        style={{ marginTop: "1rem" }}
                      >
                        🏁 Check Out
                      </button>
                    ) : (
                      <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                        <p>✅ You have checked out for today. Daily miles: {todayCheckIn.daily_miles || 0} miles</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>You haven't checked in today yet.</p>
                    <button
                      className="btn btn-success"
                      onClick={handleCheckIn}
                      style={{ marginTop: "1rem" }}
                    >
                      🚀 Check In for Today
                    </button>
                  </div>
                )}
              </div>

              {/* Today's Summary */}
              {performanceDashboard && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="card">
                    <h4>🏪 Today's Visits</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1976d2", marginTop: "0.5rem" }}>
                      {performanceDashboard.todayVisits || 0}
                    </div>
                    <p style={{ color: "#666", fontSize: "0.875rem" }}>Completed today</p>
                  </div>
                  <div className="card">
                    <h4>📅 Week Visits</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#388e3c", marginTop: "0.5rem" }}>
                      {performanceDashboard.weekVisits || 0}
                    </div>
                    <p style={{ color: "#666", fontSize: "0.875rem" }}>This week</p>
                  </div>
                  <div className="card">
                    <h4>🚙 Week Miles</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f57c00", marginTop: "0.5rem" }}>
                      {performanceDashboard.weekMiles || 0}
                    </div>
                    <p style={{ color: "#666", fontSize: "0.875rem" }}>Miles driven</p>
                  </div>
                  <div className="card">
                    <h4>📷 Week Photos</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#7b1fa2", marginTop: "0.5rem" }}>
                      {performanceDashboard.weekPhotos || 0}
                    </div>
                    <p style={{ color: "#666", fontSize: "0.875rem" }}>Photos taken</p>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="card">
                <h3>⚡ Quick Actions</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSalesRepView("visits");
                      setShowVisitForm(true);
                    }}
                    disabled={!todayCheckIn || todayCheckIn.status !== "checked_in"}
                  >
                    🏪 Start New Visit
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSalesRepView("mileage");
                      setShowMileageForm(true);
                    }}
                  >
                    🚙 Log Mileage
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSalesRepView("photos");
                      setShowPhotoUpload(true);
                    }}
                  >
                    📷 Upload Photo
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSalesRepView("visits")}
                  >
                    📅 View Schedule
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              {todayVisits.length > 0 && (
                <div className="card">
                  <h3>🕒 Today's Activity</h3>
                  <div style={{ marginTop: "1rem" }}>
                    {todayVisits.slice(0, 5).map((visit) => (
                      <div
                        key={visit.id}
                        style={{
                          padding: "1rem",
                          borderBottom: "1px solid #eee",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "bold" }}>{visit.account_name || `Account #${visit.account_id}`}</div>
                          <div style={{ fontSize: "0.875rem", color: "#666" }}>
                            {new Date(visit.check_in_time).toLocaleTimeString()} - {visit.purpose}
                          </div>
                        </div>
                        <span
                          className={`badge badge-${visit.status === "completed" ? "success" : visit.status === "in_progress" ? "warning" : "info"}`}
                        >
                          {visit.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visits View */}
          {salesRepView === "visits" && (
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>🏪 Account Visits</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowVisitForm(true)}
                    disabled={!todayCheckIn || todayCheckIn.status !== "checked_in"}
                  >
                    ➕ Start Visit
                  </button>
                </div>
              </div>

              {/* Authorized Accounts */}
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h4>🔑 My Authorized Accounts</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                  {authorizedAccounts.map((account) => (
                    <div
                      key={account.account_id}
                      style={{
                        padding: "1rem",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        backgroundColor: "#f8f9fa",
                      }}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{account.account_name}</div>
                      <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                        {account.business_name}
                      </div>
                      <div style={{ marginTop: "0.5rem" }}>
                        <span className={`badge badge-${account.authorization_type === "full_access" ? "success" : "info"}`}>
                          {account.authorization_type}
                        </span>
                      </div>
                      {account.last_visit_date && (
                        <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.5rem" }}>
                          Last visit: {new Date(account.last_visit_date).toLocaleDateString()}
                        </div>
                      )}
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setVisitForm({ ...visitForm, account_id: account.account_id });
                          setShowVisitForm(true);
                        }}
                        style={{ marginTop: "0.75rem", width: "100%" }}
                        disabled={!todayCheckIn || todayCheckIn.status !== "checked_in"}
                      >
                        🚀 Start Visit
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Today's Visits */}
              {todayVisits.length > 0 && (
                <div className="card" style={{ marginBottom: "1rem" }}>
                  <h4>📅 Today's Visits</h4>
                  <div style={{ marginTop: "1rem" }}>
                    {todayVisits.map((visit) => (
                      <div
                        key={visit.id}
                        style={{
                          padding: "1rem",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          marginBottom: "1rem",
                          backgroundColor: visit.status === "in_progress" ? "#fff3e0" : "#f8f9fa",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div>
                            <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                              {visit.account_name || `Account #${visit.account_id}`}
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                              Check-in: {new Date(visit.check_in_time).toLocaleTimeString()}
                            </div>
                            {visit.check_out_time && (
                              <div style={{ fontSize: "0.875rem", color: "#666" }}>
                                Check-out: {new Date(visit.check_out_time).toLocaleTimeString()} ({visit.visit_duration} min)
                              </div>
                            )}
                            <div style={{ marginTop: "0.5rem" }}>
                              <span className="badge badge-info">{visit.purpose}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <span
                              className={`badge badge-${
                                visit.status === "completed" ? "success" : visit.status === "in_progress" ? "warning" : "info"
                              }`}
                            >
                              {visit.status}
                            </span>
                            {visit.status === "in_progress" && (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleVisitCheckOut(visit.id)}
                              >
                                ✅ Check Out
                              </button>
                            )}
                          </div>
                        </div>
                        {visit.notes && (
                          <div
                            style={{
                              marginTop: "0.75rem",
                              padding: "0.75rem",
                              backgroundColor: "#fff",
                              borderRadius: "4px",
                              fontSize: "0.875rem",
                            }}
                          >
                            {visit.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled Visits */}
              {scheduledVisits.length > 0 && (
                <div className="card">
                  <h4>📆 Upcoming Scheduled Visits</h4>
                  <div style={{ marginTop: "1rem" }}>
                    {scheduledVisits.map((visit) => (
                      <div
                        key={visit.id}
                        style={{
                          padding: "1rem",
                          borderBottom: "1px solid #eee",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "bold" }}>
                            {visit.account_name || `Account #${visit.account_id}`}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#666" }}>
                            {new Date(visit.scheduled_time || "").toLocaleString()} - {visit.purpose}
                          </div>
                        </div>
                        <span className="badge badge-info">Scheduled</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mileage View */}
          {salesRepView === "mileage" && (
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>🚙 Mileage Tracking</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowMileageForm(true)}
                  >
                    ➕ Log Mileage
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                {todayMileageSummary && (
                  <div className="card">
                    <h4>📅 Today's Summary</h4>
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1976d2" }}>
                        {todayMileageSummary.total_miles || 0} mi
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                        {todayMileageSummary.trip_count || 0} trips
                      </div>
                      <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#388e3c", marginTop: "0.5rem" }}>
                        ${(todayMileageSummary.total_miles * 0.585).toFixed(2)}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#666" }}>Estimated reimbursement</div>
                    </div>
                  </div>
                )}
                {monthlyMileageSummary && (
                  <div className="card">
                    <h4>📊 Monthly Summary</h4>
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f57c00" }}>
                        {monthlyMileageSummary.total_miles || 0} mi
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                        {monthlyMileageSummary.trip_count || 0} trips
                      </div>
                      <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#388e3c", marginTop: "0.5rem" }}>
                        ${monthlyMileageSummary.total_reimbursement}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#666" }}>
                        Pending: {monthlyMileageSummary.pending_trips} | Approved: {monthlyMileageSummary.approved_trips}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mileage Logs Table */}
              {mileageLogs.length > 0 && (
                <div className="card">
                  <h4>📝 Mileage Logs</h4>
                  <table className="table" style={{ marginTop: "1rem" }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Miles</th>
                        <th>Purpose</th>
                        <th>Reimbursement</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mileageLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.trip_date).toLocaleDateString()}</td>
                          <td>{log.total_miles} mi</td>
                          <td>{log.purpose}</td>
                          <td>${log.reimbursement_amount.toFixed(2)}</td>
                          <td>
                            <span
                              className={`badge badge-${
                                log.reimbursement_status === "approved"
                                  ? "success"
                                  : log.reimbursement_status === "paid"
                                  ? "info"
                                  : "warning"
                              }`}
                            >
                              {log.reimbursement_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Photos View */}
          {salesRepView === "photos" && (
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>📷 Photo Gallery</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowPhotoUpload(true)}
                  >
                    ➕ Upload Photo
                  </button>
                </div>
              </div>

              {photoGallery.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                  {photoGallery.map((photo) => (
                    <div
                      key={photo.id}
                      className="card"
                      style={{ padding: "0", overflow: "hidden" }}
                    >
                      <div
                        style={{
                          height: "200px",
                          backgroundColor: "#f0f0f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "3rem",
                        }}
                      >
                        📷
                      </div>
                      <div style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: "bold" }}>
                          {photo.account_name || `Account #${photo.account_id}`}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                          {new Date(photo.taken_at).toLocaleString()}
                        </div>
                        <div style={{ marginTop: "0.5rem" }}>
                          <span className="badge badge-info">{photo.photo_type}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.5rem" }}>
                          {photo.file_name} ({(photo.file_size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card">
                  <p style={{ textAlign: "center", color: "#666" }}>No photos yet. Upload your first photo!</p>
                </div>
              )}
            </div>
          )}

          {/* Performance View */}
          {salesRepView === "performance" && (
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h3>📈 Performance Analytics</h3>
              </div>

              {/* KPI Cards */}
              {performanceDashboard && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="card">
                    <h4>🏪 Total Visits</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1976d2", marginTop: "0.5rem" }}>
                      {performanceDashboard.todayVisits + performanceDashboard.weekVisits}
                    </div>
                  </div>
                  <div className="card">
                    <h4>✅ Completion Rate</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#388e3c", marginTop: "0.5rem" }}>
                      {performanceDashboard.weekVisits > 0 ? "100%" : "N/A"}
                    </div>
                  </div>
                  <div className="card">
                    <h4>🚙 Total Miles</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f57c00", marginTop: "0.5rem" }}>
                      {performanceDashboard.weekMiles || 0}
                    </div>
                  </div>
                  <div className="card">
                    <h4>📷 Photos Taken</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#7b1fa2", marginTop: "0.5rem" }}>
                      {performanceDashboard.weekPhotos || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Weekly Summary */}
              {weeklyPerformance && weeklyPerformance.weeks && weeklyPerformance.weeks.length > 0 && (
                <div className="card">
                  <h4>📊 Weekly Breakdown</h4>
                  <table className="table" style={{ marginTop: "1rem" }}>
                    <thead>
                      <tr>
                        <th>Week Period</th>
                        <th>Visits</th>
                        <th>Miles</th>
                        <th>Photos</th>
                        <th>Completion %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyPerformance.weeks.map((week: any, index: number) => (
                        <tr key={index}>
                          <td>{week.week_start} - {week.week_end}</td>
                          <td>{week.total_visits}</td>
                          <td>{week.total_miles} mi</td>
                          <td>{week.total_photos}</td>
                          <td>
                            <span className="badge badge-success">
                              {week.completion_percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Visit Form Modal */}
          {showVisitForm && (
            <div className="modal-overlay" onClick={() => setShowVisitForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>🏪 Start Account Visit</h3>
                <div className="form-group">
                  <label>Account</label>
                  <select
                    className="form-input"
                    value={visitForm.account_id}
                    onChange={(e) => setVisitForm({ ...visitForm, account_id: parseInt(e.target.value) })}
                  >
                    <option value={0}>Select an account...</option>
                    {authorizedAccounts.map((account) => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_name} - {account.business_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Visit Purpose</label>
                  <select
                    className="form-input"
                    value={visitForm.purpose}
                    onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                  >
                    <option value="Sales call">Sales call</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Support">Support</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Demo">Demo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    className="form-input"
                    value={visitForm.notes}
                    onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                    rows={3}
                    placeholder="Add visit notes..."
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowVisitForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleVisitCheckIn}
                    disabled={!visitForm.account_id}
                  >
                    ✅ Check In
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mileage Form Modal */}
          {showMileageForm && (
            <div className="modal-overlay" onClick={() => setShowMileageForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>🚙 Log Mileage</h3>
                <div className="form-group">
                  <label>Total Miles *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={mileageForm.total_miles}
                    onChange={(e) => setMileageForm({ ...mileageForm, total_miles: e.target.value })}
                    placeholder="0.0"
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Purpose</label>
                  <select
                    className="form-input"
                    value={mileageForm.purpose}
                    onChange={(e) => setMileageForm({ ...mileageForm, purpose: e.target.value })}
                  >
                    <option value="Account visits">Account visits</option>
                    <option value="Client meeting">Client meeting</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Territory travel">Territory travel</option>
                    <option value="Training">Training</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Start Odometer (Optional)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={mileageForm.start_odometer}
                      onChange={(e) => setMileageForm({ ...mileageForm, start_odometer: e.target.value })}
                      placeholder="12345"
                    />
                  </div>
                  <div className="form-group">
                    <label>End Odometer (Optional)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={mileageForm.end_odometer}
                      onChange={(e) => setMileageForm({ ...mileageForm, end_odometer: e.target.value })}
                      placeholder="12390"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    className="form-input"
                    value={mileageForm.notes}
                    onChange={(e) => setMileageForm({ ...mileageForm, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional details..."
                  />
                </div>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#e8f5e9",
                    borderRadius: "4px",
                    marginTop: "1rem",
                  }}
                >
                  <div style={{ fontSize: "0.875rem", color: "#666" }}>Estimated Reimbursement</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#388e3c" }}>
                    ${(parseFloat(mileageForm.total_miles || "0") * 0.585).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>@ $0.585 per mile (IRS rate)</div>
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowMileageForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleLogMileage}
                    disabled={!mileageForm.total_miles}
                  >
                    💾 Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Photo Upload Modal */}
          {showPhotoUpload && (
            <div className="modal-overlay" onClick={() => setShowPhotoUpload(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>📷 Upload Visit Photo</h3>
                <div className="form-group">
                  <label>Visit *</label>
                  <select
                    className="form-input"
                    value={photoForm.visit_id}
                    onChange={(e) => setPhotoForm({ ...photoForm, visit_id: parseInt(e.target.value) })}
                  >
                    <option value={0}>Select a visit...</option>
                    {todayVisits.map((visit) => (
                      <option key={visit.id} value={visit.id}>
                        {visit.account_name || `Account #${visit.account_id}`} - {new Date(visit.check_in_time).toLocaleTimeString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Photo Type</label>
                  <select
                    className="form-input"
                    value={photoForm.photo_type}
                    onChange={(e) => setPhotoForm({ ...photoForm, photo_type: e.target.value })}
                  >
                    <option value="display">Display</option>
                    <option value="inventory">Inventory</option>
                    <option value="product">Product</option>
                    <option value="signage">Signage</option>
                    <option value="storefront">Storefront</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>File Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={photoForm.file_name}
                    onChange={(e) => setPhotoForm({ ...photoForm, file_name: e.target.value })}
                    placeholder="photo.jpg"
                  />
                </div>
                <div
                  style={{
                    padding: "2rem",
                    border: "2px dashed #ddd",
                    borderRadius: "8px",
                    textAlign: "center",
                    backgroundColor: "#f8f9fa",
                    marginTop: "1rem",
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📁</div>
                  <div style={{ color: "#666", fontSize: "0.875rem" }}>
                    Click to select file or drag and drop
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>
                    JPG, PNG (Max 10MB)
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowPhotoUpload(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handlePhotoUpload}
                    disabled={!photoForm.visit_id}
                  >
                    📤 Upload
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warehouse Tab */}
      {activeTab === "warehouse" && (
        <div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2>📦 Warehouse Management</h2>
            <p>Inventory tracking, receiving, picking, locations, and real-time scanning operations</p>
          </div>

          {/* Sub-Navigation */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", padding: "1rem", flexWrap: "wrap" }}>
              <button
                className={`btn ${warehouseView === "dashboard" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWarehouseView("dashboard")}
              >
                📊 Dashboard
              </button>
              <button
                className={`btn ${warehouseView === "locations" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWarehouseView("locations")}
              >
                📍 Locations
              </button>
              <button
                className={`btn ${warehouseView === "inventory" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWarehouseView("inventory")}
              >
                📦 Inventory
              </button>
              <button
                className={`btn ${warehouseView === "receiving" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWarehouseView("receiving")}
              >
                📥 Receiving
              </button>
              <button
                className={`btn ${warehouseView === "picking" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWarehouseView("picking")}
              >
                📤 Picking
              </button>
              <button
                className={`btn ${warehouseView === "reports" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setWarehouseView("reports")}
              >
                📈 Reports
              </button>
            </div>
          </div>

          {/* Dashboard View */}
          {warehouseView === "dashboard" && warehouseDashboard && (
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h3>📊 Warehouse KPIs</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                  <div style={{ padding: "1rem", backgroundColor: "#e7f5ff", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Total Locations</div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                      {warehouseDashboard.kpis.total_locations}
                    </div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "#fff3e0", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Total Inventory</div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                      {warehouseDashboard.kpis.total_inventory_items.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "#e8f5e9", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Scans Today</div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                      {warehouseDashboard.kpis.scans_today}
                    </div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "#f3e5f5", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Active Picking</div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                      {warehouseDashboard.kpis.active_picking}
                    </div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "#fce4ec", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Active Receiving</div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                      {warehouseDashboard.kpis.active_receiving}
                    </div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "#ffe0b2", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Pending Shipments</div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem" }}>
                      {warehouseDashboard.kpis.pending_shipments}
                    </div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "#ffebee", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>Low Stock Items</div>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", color: "#d32f2f" }}>
                      {warehouseDashboard.kpis.low_stock_items}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3>📡 Recent Scans</h3>
                  <button className="btn btn-primary" onClick={() => setShowScanForm(true)}>
                    📷 New Scan
                  </button>
                </div>
                {inventoryScans.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Product</th>
                          <th>Location</th>
                          <th>Quantity</th>
                          <th>Status</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryScans.slice(0, 10).map((scan) => (
                          <tr key={scan.id}>
                            <td><span className="badge" style={{ backgroundColor: "#2196F3", color: "white" }}>{scan.scan_type}</span></td>
                            <td>{scan.product_sku || scan.sku}</td>
                            <td>{scan.location_code}</td>
                            <td>{scan.quantity}</td>
                            <td>
                              <span className={`badge ${scan.status === "success" ? "badge-success" : "badge-danger"}`}>
                                {scan.status === "success" ? "✅ Success" : "❌ Error"}
                              </span>
                            </td>
                            <td>{new Date(scan.scanned_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No recent scans</p>
                )}
              </div>
            </div>
          )}

          {/* Locations View */}
          {warehouseView === "locations" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>📍 Warehouse Locations</h3>
                <button className="btn btn-primary" onClick={() => setShowLocationForm(true)}>
                  + Add Location
                </button>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <select
                  className="form-select"
                  value={warehouseZoneFilter}
                  onChange={(e) => setWarehouseZoneFilter(e.target.value)}
                >
                  <option value="all">All Zones</option>
                  <option value="RECEIVING">Receiving</option>
                  <option value="ZONE-A">Zone A</option>
                  <option value="ZONE-B">Zone B</option>
                  <option value="SHIPPING">Shipping</option>
                  <option value="QUALITY">Quality/QA</option>
                </select>
              </div>

              {warehouseLocations.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Location Code</th>
                        <th>Zone</th>
                        <th>Type</th>
                        <th>Aisle</th>
                        <th>Shelf</th>
                        <th>Position</th>
                        <th>Capacity</th>
                        <th>Current</th>
                        <th>Utilization</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseLocations.map((location) => {
                        const utilization = location.capacity > 0 ? (location.current_capacity / location.capacity * 100).toFixed(0) : 0;
                        return (
                          <tr key={location.id} style={{ cursor: "pointer" }} onClick={() => setSelectedWarehouseLocation(location)}>
                            <td><strong>{location.location_code}</strong></td>
                            <td><span className="badge" style={{ backgroundColor: "#2196F3", color: "white" }}>{location.zone}</span></td>
                            <td>{location.location_type}</td>
                            <td>{location.aisle || "-"}</td>
                            <td>{location.shelf || "-"}</td>
                            <td>{location.position || "-"}</td>
                            <td>{location.capacity}</td>
                            <td>{location.current_capacity}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ flex: 1, height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                                  <div style={{ width: `${utilization}%`, height: "100%", backgroundColor: parseFloat(utilization as string) > 80 ? "#f44336" : parseFloat(utilization as string) > 60 ? "#ff9800" : "#4caf50" }}></div>
                                </div>
                                <span style={{ fontSize: "0.875rem" }}>{utilization}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${location.is_active ? "badge-success" : "badge-secondary"}`}>
                                {location.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No locations found</p>
              )}
            </div>
          )}

          {/* Inventory View */}
          {warehouseView === "inventory" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>📦 Inventory by Location</h3>
                <button className="btn btn-primary" onClick={() => setShowScanForm(true)}>
                  📷 Scan Item
                </button>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <select
                  className="form-select"
                  value={warehouseZoneFilter}
                  onChange={(e) => setWarehouseZoneFilter(e.target.value)}
                >
                  <option value="all">All Zones</option>
                  <option value="RECEIVING">Receiving</option>
                  <option value="ZONE-A">Zone A</option>
                  <option value="ZONE-B">Zone B</option>
                  <option value="SHIPPING">Shipping</option>
                  <option value="QUALITY">Quality/QA</option>
                </select>
              </div>

              {productLocations.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Location</th>
                        <th>Zone</th>
                        <th>Quantity</th>
                        <th>Primary</th>
                        <th>Last Counted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productLocations.map((inv) => (
                        <tr key={inv.id}>
                          <td>{inv.product_name}</td>
                          <td><strong>{inv.product_sku}</strong></td>
                          <td>{inv.location_code}</td>
                          <td><span className="badge" style={{ backgroundColor: "#2196F3", color: "white" }}>{inv.zone}</span></td>
                          <td>
                            <strong style={{ fontSize: "1.1rem", color: inv.quantity < 50 ? "#d32f2f" : "#000" }}>
                              {inv.quantity}
                            </strong>
                            {inv.quantity < 50 && <span style={{ color: "#d32f2f", marginLeft: "0.5rem" }}>⚠️ Low</span>}
                          </td>
                          <td>
                            {inv.is_primary ? (
                              <span className="badge badge-success">✓ Primary</span>
                            ) : (
                              <span className="badge badge-secondary">Secondary</span>
                            )}
                          </td>
                          <td>{new Date(inv.last_counted).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No inventory found</p>
              )}
            </div>
          )}

          {/* Receiving View */}
          {warehouseView === "receiving" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>📥 Receiving Shipments</h3>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <select
                  className="form-select"
                  value={warehouseStatusFilter}
                  onChange={(e) => setWarehouseStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {receivingShipments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Shipment #</th>
                        <th>PO Number</th>
                        <th>Carrier</th>
                        <th>Status</th>
                        <th>Expected</th>
                        <th>Progress</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivingShipments.map((shipment) => (
                        <tr key={shipment.id}>
                          <td><strong>{shipment.shipment_number}</strong></td>
                          <td>{shipment.po_number}</td>
                          <td>{shipment.carrier}</td>
                          <td>
                            <span className={`badge ${
                              shipment.status === "completed" ? "badge-success" :
                              shipment.status === "in_progress" ? "badge-warning" :
                              "badge-secondary"
                            }`}>
                              {shipment.status}
                            </span>
                          </td>
                          <td>{new Date(shipment.expected_arrival).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                                <div style={{ width: `${(shipment.items_received / shipment.total_items * 100)}%`, height: "100%", backgroundColor: "#4caf50" }}></div>
                              </div>
                              <span style={{ fontSize: "0.875rem" }}>{shipment.items_received}/{shipment.total_items}</span>
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => loadReceivingShipmentDetails(shipment.id)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No receiving shipments found</p>
              )}
            </div>
          )}

          {/* Picking View */}
          {warehouseView === "picking" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>📤 Pick Lists</h3>
                <button className="btn btn-primary" onClick={() => setShowPickListForm(true)}>
                  + Create Pick List
                </button>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <select
                  className="form-select"
                  value={warehouseStatusFilter}
                  onChange={(e) => setWarehouseStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {pickLists.length > 0 ? (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pick List #</th>
                        <th>Order ID</th>
                        <th>Priority</th>
                        <th>Zone</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickLists.map((pickList) => (
                        <tr key={pickList.id}>
                          <td><strong>{pickList.pick_list_number}</strong></td>
                          <td>#{pickList.order_id}</td>
                          <td>
                            <span className={`badge ${
                              pickList.priority === "urgent" ? "badge-danger" :
                              pickList.priority === "high" ? "badge-warning" :
                              "badge-secondary"
                            }`}>
                              {pickList.priority}
                            </span>
                          </td>
                          <td><span className="badge" style={{ backgroundColor: "#2196F3", color: "white" }}>{pickList.zone}</span></td>
                          <td>
                            <span className={`badge ${
                              pickList.status === "completed" ? "badge-success" :
                              pickList.status === "in_progress" ? "badge-warning" :
                              "badge-secondary"
                            }`}>
                              {pickList.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: "8px", backgroundColor: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                                <div style={{ width: `${(pickList.items_picked / pickList.total_items * 100)}%`, height: "100%", backgroundColor: "#4caf50" }}></div>
                              </div>
                              <span style={{ fontSize: "0.875rem" }}>{pickList.items_picked}/{pickList.total_items}</span>
                            </div>
                          </td>
                          <td>{new Date(pickList.created_at).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => loadPickListDetails(pickList.id)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No pick lists found</p>
              )}
            </div>
          )}

          {/* Reports View */}
          {warehouseView === "reports" && (
            <div className="card">
              <h3>📈 Warehouse Reports</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px", cursor: "pointer" }}>
                  <h4>📊 Worker Productivity</h4>
                  <p>View scan counts, success rates, and worker performance metrics</p>
                </div>
                <div style={{ padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px", cursor: "pointer" }}>
                  <h4>📦 Inventory Aging</h4>
                  <p>Track days since last count for cycle count planning</p>
                </div>
                <div style={{ padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px", cursor: "pointer" }}>
                  <h4>🚀 SKU Velocity</h4>
                  <p>ABC classification based on movement frequency</p>
                </div>
                <div style={{ padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px", cursor: "pointer" }}>
                  <h4>📍 Location Utilization</h4>
                  <p>Monitor warehouse space usage with capacity tracking</p>
                </div>
                <div style={{ padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px", cursor: "pointer" }}>
                  <h4>📋 Audit Logs</h4>
                  <p>Complete trail of all warehouse operations</p>
                </div>
                <div style={{ padding: "1.5rem", backgroundColor: "#f5f5f5", borderRadius: "8px", cursor: "pointer" }}>
                  <h4>📈 Performance Trends</h4>
                  <p>Historical analysis of warehouse operations</p>
                </div>
              </div>

              {inventoryScans.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h4>Recent Scan Activity</h4>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Product SKU</th>
                          <th>Location</th>
                          <th>Quantity</th>
                          <th>Status</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryScans.map((scan) => (
                          <tr key={scan.id}>
                            <td><span className="badge" style={{ backgroundColor: "#2196F3", color: "white" }}>{scan.scan_type}</span></td>
                            <td>{scan.product_sku || scan.sku}</td>
                            <td>{scan.location_code}</td>
                            <td>{scan.quantity}</td>
                            <td>
                              <span className={`badge ${scan.status === "success" ? "badge-success" : "badge-danger"}`}>
                                {scan.status}
                              </span>
                            </td>
                            <td>{new Date(scan.scanned_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan Form Modal */}
          {showScanForm && (
            <div className="modal-overlay" onClick={() => setShowScanForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>📷 Process Scan</h3>
                <div className="form-group">
                  <label>Scan Type *</label>
                  <select
                    className="form-select"
                    value={scanForm.scan_type}
                    onChange={(e) => setScanForm({ ...scanForm, scan_type: e.target.value })}
                  >
                    <option value="cycle_count">Cycle Count</option>
                    <option value="receiving">Receiving</option>
                    <option value="picking">Picking</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Product SKU *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={scanForm.sku}
                    onChange={(e) => setScanForm({ ...scanForm, sku: e.target.value })}
                    placeholder="SKU-1001"
                  />
                </div>
                <div className="form-group">
                  <label>Location ID *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={scanForm.location_id}
                    onChange={(e) => setScanForm({ ...scanForm, location_id: e.target.value })}
                    placeholder="3"
                  />
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={scanForm.quantity}
                    onChange={(e) => setScanForm({ ...scanForm, quantity: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowScanForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleWarehouseScan}
                    disabled={!scanForm.sku || !scanForm.location_id}
                  >
                    📷 Process Scan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pick List Form Modal */}
          {showPickListForm && (
            <div className="modal-overlay" onClick={() => setShowPickListForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>📤 Create Pick List</h3>
                <div className="form-group">
                  <label>Order ID *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={pickListForm.order_id}
                    onChange={(e) => setPickListForm({ ...pickListForm, order_id: e.target.value })}
                    placeholder="Order ID"
                  />
                </div>
                <div className="form-group">
                  <label>Assigned To (User ID)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={pickListForm.assigned_to}
                    onChange={(e) => setPickListForm({ ...pickListForm, assigned_to: e.target.value })}
                    placeholder="Leave blank for unassigned"
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="form-select"
                    value={pickListForm.priority}
                    onChange={(e) => setPickListForm({ ...pickListForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Zone</label>
                  <select
                    className="form-select"
                    value={pickListForm.zone}
                    onChange={(e) => setPickListForm({ ...pickListForm, zone: e.target.value })}
                  >
                    <option value="ZONE-A">Zone A</option>
                    <option value="ZONE-B">Zone B</option>
                    <option value="RECEIVING">Receiving</option>
                    <option value="SHIPPING">Shipping</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowPickListForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreatePickList}
                    disabled={!pickListForm.order_id}
                  >
                    ✅ Create Pick List
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Location Form Modal */}
          {showLocationForm && (
            <div className="modal-overlay" onClick={() => setShowLocationForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>📍 Create Location</h3>
                <div className="form-group">
                  <label>Location Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={locationForm.location_code}
                    onChange={(e) => setLocationForm({ ...locationForm, location_code: e.target.value })}
                    placeholder="A1-01-01"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Aisle</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationForm.aisle}
                      onChange={(e) => setLocationForm({ ...locationForm, aisle: e.target.value })}
                      placeholder="A1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Shelf</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationForm.shelf}
                      onChange={(e) => setLocationForm({ ...locationForm, shelf: e.target.value })}
                      placeholder="01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationForm.position}
                      onChange={(e) => setLocationForm({ ...locationForm, position: e.target.value })}
                      placeholder="01"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Zone *</label>
                  <select
                    className="form-select"
                    value={locationForm.zone}
                    onChange={(e) => setLocationForm({ ...locationForm, zone: e.target.value })}
                  >
                    <option value="RECEIVING">Receiving</option>
                    <option value="ZONE-A">Zone A</option>
                    <option value="ZONE-B">Zone B</option>
                    <option value="SHIPPING">Shipping</option>
                    <option value="QUALITY">Quality/QA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Location Type</label>
                  <select
                    className="form-select"
                    value={locationForm.location_type}
                    onChange={(e) => setLocationForm({ ...locationForm, location_type: e.target.value })}
                  >
                    <option value="standard">Standard</option>
                    <option value="receiving">Receiving</option>
                    <option value="shipping">Shipping</option>
                    <option value="quarantine">Quarantine</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={locationForm.capacity}
                    onChange={(e) => setLocationForm({ ...locationForm, capacity: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowLocationForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateLocation}
                    disabled={!locationForm.location_code || !locationForm.zone}
                  >
                    ✅ Create Location
                  </button>
                </div>
              </div>
            </div>
          )}
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

