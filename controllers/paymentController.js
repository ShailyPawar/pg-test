const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const { createOrder, updateOrderStatus } = require("../models/orderModel");

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const createOrderController = async (req, res) => {
  const { amount } = req.body;
  if (!amount || typeof amount !== "number") {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: "receipt_" + Math.floor(Math.random() * 10000),
    });

    createOrder(order, (err, result) => {
      if (err) {
        console.error("❌ DB Insert Error:", err);
        return res.status(500).json({ error: "Database insert failed" });
      }
      res.json(order);
    });
  } catch (error) {
    console.error("❌ Razorpay Error:", error);
    res.status(500).json({ error: "Order creation failed" });
  }
};

const updateOrderController = (req, res) => {
  const { order_id, status } = req.body;

  if (!order_id || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  updateOrderStatus(order_id, status, (err, result) => {
    if (err) {
      console.error("❌ DB Update Error:", err);
      return res.status(500).json({ error: "Failed to update order" });
    }
    res.json({ success: true });
  });
};

const checkStatusController = async (req, res) => {
  const { razorpay_order_id } = req.body;
  if (!razorpay_order_id) {
    return res.status(400).json({ error: "Missing order ID" });
  }

  try {
    const payments = await razorpay.orders.fetchPayments(razorpay_order_id);

    if (payments.count === 0) {
      return res.json({ status: "failed", message: "No payment found" });
    }

    const payment = payments.items[0];
    if (payment.status === "captured") {
      updateOrderStatus(razorpay_order_id, "CAPTURED", (err) => {
        if (err) console.error("❌ DB Status Update Failed:", err);
      });

      return res.json({
        status: "authorized",
        message: "Payment captured successfully",
        method: payment.method,
        amount: payment.amount / 100 + " INR",
      });
    } else {
      return res.json({
        status: "unauthorized",
        message: "Payment not captured",
        payment_status: payment.status,
      });
    }
  } catch (error) {
    console.error("❌ Error checking Razorpay payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createOrderController,
  updateOrderController,
  checkStatusController,
};
