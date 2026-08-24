const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find super admin user
    const user = await User.findOne({ email, role: 'super_admin' });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if super admin is active
    if (!user.superAdminMetadata?.isActive) {
      return res.status(403).json({ message: 'Account deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Increment failed login attempts
      user.superAdminMetadata.loginAttempts += 1;
      if (user.superAdminMetadata.loginAttempts >= 5) {
        user.superAdminMetadata.isActive = false;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    user.superAdminMetadata.loginAttempts = 0;
    user.superAdminMetadata.lastLogin = new Date();
    await user.save();

    // Create JWT token with elevated privileges
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        permissions: user.superAdminMetadata.permissions || []
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Super Admin login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login error', error: error.message });
  }
};

module.exports = { superAdminLogin };