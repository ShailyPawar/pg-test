const db = require("../config/db");

const createOrder = (orderData, callback) => {
  const sql = `
    INSERT INTO orders (razorpay_order_id, amount, currency, receipt, status)
    VALUES (?, ?, ?, ?, ?)
  `;
  const values = [
    orderData.id,
    orderData.amount,
    orderData.currency,
    orderData.receipt,
    "CREATED",
  ];
  db.query(sql, values, callback);
};

const updateOrderStatus = (orderId, status, callback) => {
  const sql = `UPDATE orders SET status = ? WHERE razorpay_order_id = ?`;
  db.query(sql, [status, orderId], callback);
};

module.exports = { createOrder, updateOrderStatus };
