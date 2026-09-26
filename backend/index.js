const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Routers
const authRoutes = require('./routes/authRoutes');

let userRoutes;
try {
  userRoutes = require('./routes/userRoutes');
} catch (e) {
  // Bỏ qua nếu chưa nạp userRoutes
}

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);

if (userRoutes) {
  app.use('/api/users', userRoutes);
}

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});