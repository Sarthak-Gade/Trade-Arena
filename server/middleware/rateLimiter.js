const ipRequestMap = new Map();

// Clean up expired keys every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestMap.entries()) {
    if (now > data.resetTime) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const rateLimiter = (limit = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!ipRequestMap.has(ip)) {
      ipRequestMap.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const clientData = ipRequestMap.get(ip);
    
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      return next();
    }
    
    clientData.count += 1;
    
    if (clientData.count > limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again later.'
      });
    }
    
    next();
  };
};

module.exports = rateLimiter;
