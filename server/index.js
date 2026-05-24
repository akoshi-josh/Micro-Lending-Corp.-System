const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/borrowers', require('./routes/borrowers'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/ledger', require('./routes/ledger'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/dashboard', require('./routes/dashboard'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});