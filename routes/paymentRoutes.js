const express = require("express");
const router = express.Router();
const {
  createOrderController,
  updateOrderController,
  checkStatusController,
} = require("../controllers/paymentController");

router.post("/create-order", createOrderController);
router.post("/update-order", updateOrderController);
router.post("/check-status", checkStatusController);

module.exports = router;

