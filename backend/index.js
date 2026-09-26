const express = require('express');
const cors = require('cors');
require('dotenv').config();

//const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
//app.use('/api', authRoutes);

// Khởi chạy Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
});