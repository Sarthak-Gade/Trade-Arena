const validateRegister = (req, res, next) => {
  const { username, email, mobile, password } = req.body;
  if (!username || !email || !mobile || !password) {
    return res.status(400).json({ success: false, message: 'All fields (username, email, mobile, password) are required' });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  
  // Mobile validation (10 digits)
  const mobileRegex = /^[0-9]{10}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({ success: false, message: 'Mobile number must be a 10-digit number' });
  }
  
  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
  }
  
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  next();
};

const validateKYC = (req, res, next) => {
  const { fullName, dob, panNumber, aadhaarNumber, address, city, state, pincode, occupation } = req.body;
  if (!fullName || !dob || !panNumber || !aadhaarNumber || !address || !city || !state || !pincode || !occupation) {
    return res.status(400).json({ success: false, message: 'All profile and address fields are required for KYC' });
  }
  
  // PAN validation: 5 uppercase letters, 4 digits, 1 uppercase letter
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(panNumber.toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Invalid PAN card format (expected ABCDE1234F)' });
  }
  
  // Aadhaar validation: 12 digits
  const aadhaarRegex = /^[0-9]{12}$/;
  if (!aadhaarRegex.test(aadhaarNumber)) {
    return res.status(400).json({ success: false, message: 'Aadhaar number must be exactly 12 digits' });
  }
  
  // Pincode validation: 6 digits
  const pincodeRegex = /^[0-9]{6}$/;
  if (!pincodeRegex.test(pincode)) {
    return res.status(400).json({ success: false, message: 'Pincode must be exactly 6 digits' });
  }
  
  next();
};

const validateOrder = (req, res, next) => {
  const { symbol, quantity, orderType, direction } = req.body;
  if (!symbol || !quantity || !orderType || !direction) {
    return res.status(400).json({ success: false, message: 'Missing required order fields: symbol, quantity, orderType, direction' });
  }
  
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
  }
  
  if (!['buy', 'sell'].includes(direction)) {
    return res.status(400).json({ success: false, message: 'Direction must be either buy or sell' });
  }
  
  if (!['market', 'limit', 'stop_loss', 'take_profit'].includes(orderType)) {
    return res.status(400).json({ success: false, message: 'Invalid order type' });
  }
  
  if (orderType === 'limit' && !req.body.price) {
    return res.status(400).json({ success: false, message: 'Limit price is required for limit orders' });
  }
  
  if (['stop_loss', 'take_profit'].includes(orderType) && !req.body.triggerPrice) {
    return res.status(400).json({ success: false, message: 'Trigger price is required for stop loss or take profit orders' });
  }
  
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateKYC,
  validateOrder
};
