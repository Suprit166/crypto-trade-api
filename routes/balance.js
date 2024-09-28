// routes/balance.js
const express = require('express');
const Trade = require('../models/Trade');

const router = express.Router();

/**
 * @route POST /balance
 * @desc Get asset-wise balance at a given timestamp
 * @access Public
 */
router.post('/balance', async (req, res) => {
  const { timestamp } = req.body;

  if (!timestamp) {
    return res.status(400).json({ error: 'Timestamp is required' });
  }

  const queryTime = new Date(timestamp);
  if (isNaN(queryTime)) {
    return res.status(400).json({ error: 'Invalid timestamp format' });
  }

  try {
    // Fetch all trades up to the given timestamp
    const trades = await Trade.find({ utc_time: { $lte: queryTime } });

    const balance = {};

    trades.forEach(trade => {
      const coin = trade.base_coin;

      // Initialize balance for the coin if not present
      if (!balance[coin]) {
        balance[coin] = 0;
      }

      // Update balance based on operation
      if (trade.operation === 'BUY') {
        balance[coin] += trade.amount;
      } else if (trade.operation === 'SELL') {
        balance[coin] -= trade.amount;
      }
    });

    // Remove coins with zero balance
    Object.keys(balance).forEach(coin => {
      if (balance[coin] === 0) {
        delete balance[coin];
      }
    });

    res.json(balance);
  } catch (err) {
    console.error('Error fetching balance:', err.message);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

module.exports = router;
