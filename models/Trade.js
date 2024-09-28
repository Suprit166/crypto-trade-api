// models/Trade.js
const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  utc_time: {
    type: Date,
    required: true,
    index: true, // Index for faster queries based on time
  },
  operation: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true,
  },
  base_coin: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  quote_coin: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive'],
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price must be positive'],
  },
});

module.exports = mongoose.model('Trade', tradeSchema);
