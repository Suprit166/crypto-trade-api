// routes/upload.js
const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Trade = require('../models/Trade');

const router = express.Router();

// Configure Multer for file uploads
const upload = multer({
  dest: 'uploads/', // Temporary storage for uploaded files
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB file size limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

/**
 * @route POST /upload-csv
 * @desc Upload and parse CSV file, then store trades in DB
 * @access Public
 */
router.post('/upload-csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const trades = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      try {
        // Destructure and parse necessary fields
        const utc_time = new Date(row['UTC_Time']);
        if (isNaN(utc_time)) {
          throw new Error(`Invalid UTC_Time format: ${row['UTC_Time']}`);
        }

        const operation = row['Operation'].toUpperCase();
        if (!['BUY', 'SELL'].includes(operation)) {
          throw new Error(`Invalid Operation: ${row['Operation']}`);
        }

        const market = row['Market'];
        if (!market.includes('/')) {
          throw new Error(`Invalid Market format: ${market}`);
        }

        const [base_coin, quote_coin] = market.split('/').map(coin => coin.trim().toUpperCase());

        const amount = parseFloat(row['Buy/Sell Amount']);
        if (isNaN(amount) || amount < 0) {
          throw new Error(`Invalid Buy/Sell Amount: ${row['Buy/Sell Amount']}`);
        }

        const price = parseFloat(row['Price']);
        if (isNaN(price) || price < 0) {
          throw new Error(`Invalid Price: ${row['Price']}`);
        }

        trades.push({
          utc_time,
          operation,
          base_coin,
          quote_coin,
          amount,
          price,
        });
      } catch (err) {
        // Handle individual row errors
        console.error(`Error parsing row: ${JSON.stringify(row)} - ${err.message}`);
      }
    })
    .on('end', async () => {
      try {
        if (trades.length === 0) {
          return res.status(400).json({ error: 'No valid trade data found in CSV' });
        }

        // Insert parsed trades into MongoDB
        await Trade.insertMany(trades);
        res.status(200).json({ message: `${trades.length} trades successfully uploaded and saved.` });
      } catch (err) {
        console.error('Error saving trades to DB:', err.message);
        res.status(500).json({ error: 'Failed to save trades to the database' });
      } finally {
        // Clean up: delete the uploaded file
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting uploaded file:', err.message);
        });
      }
    })
    .on('error', (err) => {
      console.error('Error reading CSV file:', err.message);
      res.status(500).json({ error: 'Failed to process CSV file' });
      // Clean up: delete the uploaded file
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr.message);
      });
    });
});

module.exports = router;
