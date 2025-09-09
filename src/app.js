const express = require('express');
const connectDB = require('./config/db');

const app = express();

const PORT = process.env.PORT || 8080;

// Connect to MongoDB
connectDB();

app.use('/', (req, res) => {
  res.send('Test from hello world');
});



app.listen(PORT, () => {
  console.log(`Server is successfully listening on port ${PORT}...`);
});
