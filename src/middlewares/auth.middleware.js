import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';


/**
 * Middleware to authenticate user using JWT token stored in cookies
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: '❌ Please login first!' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from decoded token
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(404).json({ error: '❌ User not found' });
    }

    req.user = user; // Attach user to request
    next();
  } catch (err) {
    console.error('Auth Error:', err.message);
    return res.status(401).json({ error: '❌ Unauthorized: ' + err.message });
  }
};
