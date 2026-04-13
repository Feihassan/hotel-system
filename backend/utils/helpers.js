const { v4: uuidv4 } = require('uuid');

const generateReceiptNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${year}${month}${day}-${random}`;
};

const calculateNights = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1; // Minimum 1 night
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

module.exports = {
  generateReceiptNumber,
  calculateNights,
  formatCurrency,
  formatDate,
  formatDateTime,
};
