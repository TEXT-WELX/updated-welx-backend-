const jwt = require('jsonwebtoken');

const superAdminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Access denied. Super Admin privileges required.' 
      });
    }

    if (decoded.ipWhitelist && decoded.ipWhitelist.length > 0) {
      const clientIP = req.ip;
      if (!decoded.ipWhitelist.includes(clientIP)) {
        return res.status(403).json({ message: 'IP not whitelisted' });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};

module.exports = superAdminAuth;