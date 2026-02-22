// 认证中间件
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// 生成JWT Token
const generateToken = (userId, userRole = 'user') => {
  const payload = {
    sub: userId,
    role: userRole,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// 验证JWT Token中间件
const authenticate = (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '需要认证令牌'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 将用户信息附加到请求对象
    req.user = {
      id: decoded.sub,
      role: decoded.role
    };
    
    logger.debug(`用户认证成功: ${req.user.id} (${req.user.role})`);
    next();
  } catch (error) {
    logger.warn(`JWT验证失败: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: '令牌已过期，请重新登录'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'InvalidToken',
        message: '无效的认证令牌'
      });
    }
    
    return res.status(500).json({
      error: 'AuthenticationError',
      message: '认证过程发生错误'
    });
  }
};

// 检查用户角色权限
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '需要认证'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`权限不足: ${req.user.id} 尝试访问 ${req.user.role} 权限的资源`);
      return res.status(403).json({
        error: 'Forbidden',
        message: '权限不足'
      });
    }
    
    next();
  };
};

// 会员权限检查
const checkMembership = (req, res, next) => {
  // 这里需要查询数据库检查用户会员状态
  // 暂时假设所有认证用户都有基础权限
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '需要登录'
    });
  }
  
  // 附加会员检查标记，后续可以从数据库获取
  req.user.hasMembership = true; // 临时设置
  next();
};

// 游客可访问（可选认证）
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.sub,
      role: decoded.role
    };
    
    logger.debug(`可选认证成功: ${req.user.id}`);
  } catch (error) {
    // token无效，当作游客
    req.user = null;
    logger.debug(`可选认证失败，作为游客访问`);
  }
  
  next();
};

module.exports = {
  generateToken,
  authenticate,
  authorize,
  checkMembership,
  optionalAuth
};