-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  subject TEXT,
  body TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'sent',
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  email_alerts BOOLEAN DEFAULT 1,
  sms_alerts BOOLEAN DEFAULT 0,
  low_stock_alert BOOLEAN DEFAULT 1,
  order_confirmation BOOLEAN DEFAULT 1,
  shipment_notification BOOLEAN DEFAULT 1,
  payment_reminder BOOLEAN DEFAULT 1,
  weekly_summary BOOLEAN DEFAULT 1,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
