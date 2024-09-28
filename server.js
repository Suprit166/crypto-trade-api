// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Trade = require('./models/Trade');
require('dotenv').config();
const balanceRouter = require('./routes/balance');
const uploadRouter = require('./routes/upload');

const app = express();

app.use(express.json());

app.use('/api', balanceRouter);

app.use('/api', uploadRouter);


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Configure file storage
const upload = multer({ dest: 'uploads/' });

// API for uploading CSV file
app.post('/upload-csv', upload.single('file'), (req, res) => {
    const filePath = req.file.path;
    const trades = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            const [base_coin, quote_coin] = row['Market'].split('/');
            trades.push({
                utc_time: new Date(row['UTC_Time']),
                operation: row['Operation'],
                base_coin,
                quote_coin,
                amount: parseFloat(row['Buy/Sell Amount']),
                price: parseFloat(row['Price'])
            });
        })
        .on('end', async () => {
            try {
                await Trade.insertMany(trades);
                res.status(200).send('Trades successfully uploaded and saved.');
            } catch (err) {
                res.status(500).send('Error saving trades: ' + err.message);
            } finally {
                fs.unlinkSync(filePath); // Clean up uploaded file
            }
        });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
