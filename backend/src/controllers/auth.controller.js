const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// 生成JWT令牌
const generateToken = (userId, membershipLevel) => {
  return jwt.sign(
    {
      sub: userId,
      role: membershipLevel === 'premium' ? 'premium' : 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// 用户注册
exports.register = async (req, res) => {
  try {
    const { username, email, password, phone, gender, age, city } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '用户名、邮箱和密码是必填项'
      });
    }

    // 验证用户名格式
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '用户名长度必须在3-20个字符之间'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '邮箱格式不正确'
      });
    }

    // 验证密码强度
    if (password.length < 6) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '密码长度至少6位'
      });
    }

    // 检查用户名是否已存在
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return res.status(409).json({
        error: 'Conflict',
        message: '用户名已被注册'
      });
    }

    // 检查邮箱是否已存在
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(409).json({
        error: 'Conflict',
        message: '邮箱已被注册'
      });
    }

    // 检查手机号是否已存在（如果提供了）
    if (phone) {
      const phoneExists = await User.phoneExists(phone);
      if (phoneExists) {
        return res.status(409).json({
          error: 'Conflict',
          message: '手机号已被注册'
        });
      }
    }

    // 创建用户
    const userData = {
      username,
      email,
      password,
      phone,
      gender: gender || 'unknown',
      age: age || null,
      city: city || ''
    };

    const user = await User.create(userData);

    // 生成令牌
    const token = generateToken(user.id, user.membership_level);

    // 记录注册成功
    logger.info('用户注册成功', { userId: user.id, username: user.username });

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          membershipLevel: user.membership_level,
          createdAt: user.created_at
        },
        token
      }
    });

  } catch (error) {
    logger.error('用户注册失败', { error: error.message, data: req.body });
    
    if (error.code === '23505') { // PostgreSQL唯一约束违反
      return res.status(409).json({
        error: 'Conflict',
        message: '用户名或邮箱已存在'
      });
    }

    res.status(500).json({
      error: 'RegistrationError',
      message: '注册失败，请稍后重试'
    });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '用户名和密码是必填项'
      });
    }

    // 验证用户凭证
    const authResult = await User.authenticate(username, password);
    
    if (!authResult.success) {
      return res.status(401).json({
        error: 'AuthenticationError',
        message: authResult.error
      });
    }

    const user = authResult.user;

    // 生成令牌
    const token = generateToken(user.id, user.membership_level);

    // 记录登录成功
    logger.info('用户登录成功', { userId: user.id, username: user.username });

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatar_url,
          membershipLevel: user.membership_level,
          membershipExpiresAt: user.membership_expires_at
        },
        token
      }
    });

  } catch (error) {
    logger.error('用户登录失败', { error: error.message, username: req.body.username });
    
    res.status(500).json({
      error: 'LoginError',
      message: '登录失败，请稍后重试'
    });
  }
};

// 获取当前用户信息
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'NotFound',
        message: '用户不存在'
      });
    }

    // 获取用户统计数据
    const stats = await User.getStats(userId);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          gender: user.gender,
          age: user.age,
          city: user.city,
          membershipLevel: user.membership_level,
          membershipExpiresAt: user.membership_expires_at,
          isVerified: user.is_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          stats
        }
      }
    });

  } catch (error) {
    logger.error('获取用户信息失败', { userId: req.user.id, error: error.message });
    
    res.status(500).json({
      error: 'ServerError',
      message: '获取用户信息失败'
    });
  }
};

// 更新用户信息
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // 过滤不允许更新的字段
    const allowedFields = ['username', 'email', 'phone', 'avatar_url', 'bio', 'gender', 'age', 'city'];
    const filteredData = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        filteredData[key] = value;
      }
    }

    // 如果尝试更新用户名或邮箱，检查唯一性
    if (filteredData.username && filteredData.username !== req.user.username) {
      const usernameExists = await User.usernameExists(filteredData.username);
      if (usernameExists) {
        return res.status(409).json({
          error: 'Conflict',
          message: '用户名已被使用'
        });
      }
    }

    if (filteredData.email && filteredData.email !== req.user.email) {
      const emailExists = await User.emailExists(filteredData.email);
      if (emailExists) {
        return res.status(409).json({
          error: 'Conflict',
          message: '邮箱已被使用'
        });
      }
    }

    // 更新用户信息
    const updatedUser = await User.update(userId, filteredData);

    logger.info('用户信息更新成功', { userId: updatedUser.id });

    res.status(200).json({
      success: true,
      message: '个人信息更新成功',
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatar_url,
          bio: updatedUser.bio,
          gender: updatedUser.gender,
          age: updatedUser.age,
          city: updatedUser.city,
          membershipLevel: updatedUser.membership_level,
          updatedAt: updatedUser.updated_at
        }
      }
    });

  } catch (error) {
    logger.error('更新用户信息失败', { userId: req.user.id, error: error.message });
    
    res.status(500).json({
      error: 'UpdateError',
      message: '更新个人信息失败'
    });
  }
};

// 更新密码
exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '当前密码和新密码是必填项'
      });
    }

    // 验证新密码强度
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '新密码长度至少6位'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await User.verifyPassword(userId, currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'AuthenticationError',
        message: '当前密码不正确'
      });
    }

    // 更新密码
    await User.updatePassword(userId, newPassword);

    logger.info('密码更新成功', { userId });

    res.status(200).json({
      success: true,
      message: '密码更新成功'
    });

  } catch (error) {
    logger.error('密码更新失败', { userId: req.user.id, error: error.message });
    
    res.status(500).json({
      error: 'PasswordUpdateError',
      message: '密码更新失败'
    });
  }
};

// 登出（客户端负责删除令牌）
exports.logout = (req, res) => {
  // 在无状态JWT中，登出由客户端处理
  // 这里可以记录登出日志或添加到令牌黑名单（如果有Redis）
  
  logger.info('用户登出', { userId: req.user.id });

  res.status(200).json({
    success: true,
    message: '登出成功'
  });
};

// 验证令牌
exports.verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'NotFound',
        message: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          membershipLevel: user.membership_level
        }
      }
    });

  } catch (error) {
    logger.error('令牌验证失败', { error: error.message });
    
    res.status(500).json({
      error: 'TokenVerificationError',
      message: '令牌验证失败'
    });
  }
};