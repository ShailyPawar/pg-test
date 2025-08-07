// backend/server.js
require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const path= require("path");
const app = express();
app.use(cors());
app.use(bodyParser.json());

// app.use(express.static(path.join(__dirname, "../public")));

// ✅ MySQL DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Error:", err);
  } else {
    console.log("✅ Connected to MySQL Database");
  }
});

// app.get("/", (req, res)=>{
//     res.sendFile(path.join(__dirname, "../public", "index.html"));
// });

// ✅ Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_j3dYWKRUu4qxU8",
  key_secret: process.env.RAZORPAY_SECRET || "eKKbsdD2olnjMVbdkv7Cpkmm",
});



// ✅ Create Order API
app.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  if (!amount || typeof amount !== "number") {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Math.floor(Math.random() * 10000),
    });

    const sql = `
      INSERT INTO orders (razorpay_order_id, amount, currency, receipt, status)
      VALUES (?, ?, ?, ?, 'CREATED')
    `;
    const values = [order.id, order.amount, order.currency, order.receipt];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("❌ DB Insert Error:", err);
        return res.status(500).json({ error: "Database insert failed" });
      }

      console.log("📝 Order saved to DB:", result.insertId);
      res.json(order);
    });

  } catch (error) {
    console.error("❌ Razorpay Error:", error);
    res.status(500).json({ error: "Order creation failed" });
  }
});

// ✅ Update Order API
app.post("/update-order", (req, res) => {
  const { order_id, status } = req.body;

  if (!order_id || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    UPDATE orders SET status = ? WHERE razorpay_order_id = ?
  `;
  db.query(sql, [status, order_id], (err, result) => {
    if (err) {
      console.error("❌ DB Update Error:", err);
      return res.status(500).json({ error: "Failed to update order" });
    }

    console.log("✅ Order updated:", order_id, "→", status);
    res.json({ success: true });
  });
});

// ✅ Secure Payment Status Check API
app.post("/check-status", async (req, res) => {
  const { razorpay_order_id } = req.body;

  if (!razorpay_order_id) {
    return res.status(400).json({ error: "Missing order ID" });
  }

  try {
    const payments = await razorpay.orders.fetchPayments(razorpay_order_id);
    console.log("🔍 Payment fetched from Razorpay API:", payments);
    if (payments.count === 0) {
      console.log("❌ No payments found for order:", razorpay_order_id);
      return res.json({ status: "failed", message: "No payment found" });
    }


    const payment = payments.items[0]; // Assume 1st payment is the latest
    console.log(`📌 Payment status for ${razorpay_order_id}:`, payment.status);

    if (payment.status === "captured") {
      // Update DB
      const sql = `UPDATE orders SET status = ? WHERE razorpay_order_id = ?`;
      db.query(sql, ["CAPTURED", razorpay_order_id], (err) => {
        if (err) console.error("❌ DB Status Update Failed:", err);
      });

      return res.json({
        status: "authorized",
        message: "✅ Payment captured successfully",
        
        method: payment.method,
        amount: payment.amount / 100 + " INR",
      });
    } else {
      return res.json({
        status: "unauthorized",
        message: "❌ Payment not captured",
        payment_status: payment.status,
      });
    }

  } catch (error) {
    console.error("❌ Error checking Razorpay payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.send("Razorpay backend is running");
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});

