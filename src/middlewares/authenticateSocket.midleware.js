/**
 * Socket.IO Authentication Middleware
 */
export const authenticateSocket = async (socket, next) => {
  try {
    // Extract token from cookies
    const token = extractTokenFromCookie(socket.handshake.headers.cookie);

    if (!token) {
      return next(new Error('❌ Please login first!'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from decoded token
    const user = await User.findById(decoded._id);

    if (!user) {
      return next(new Error('❌ User not found'));
    }

    // Attach user info to socket
    socket.userId = user._id;
    socket.user = user;

    console.log(`✅ Socket authenticated: ${user.username} (${socket.id})`);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('❌ Authentication failed: ' + error.message));
  }
};


/**
 * Utility function to extract token from cookie string
 */
const extractTokenFromCookie = (cookieString) => {
    if (!cookieString) return null;
    
    const cookies = cookieString.split(';');
    const tokenCookie = cookies.find(cookie => 
      cookie.trim().startsWith('token=')
    );
    
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  };