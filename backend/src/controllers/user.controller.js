// 用户控制器
const User = require('../models/user.model');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class UserController {
  // 获取当前用户信息
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'NotFound',
          message: '用户不存在'
        });
      }

      // 检查会员状态
      const membership = await User.checkMembership(userId);

      res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          age: user.age,
          city: user.city,
          bio: user.bio,
          avatar: user.avatar,
          membershipLevel: user.membership_level,
          membershipExpiresAt: user.membership_expires_at,
          membershipStatus: membership,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      logger.error('获取当前用户信息失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取用户信息失败'
      });
    }
  }

  // 更新用户资料
  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '输入验证失败',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const updateData = req.body;

      // 过滤允许更新的字段
      const allowedUpdates = ['bio', 'gender', 'age', 'city', 'avatar'];
      const filteredUpdates = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key) && updateData[key] !== undefined) {
          filteredUpdates[key] = updateData[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '没有有效的更新字段'
        });
      }

      const updatedUser = await User.update(userId, filteredUpdates);

      res.status(200).json({
        message: '资料更新成功',
        user: updatedUser
      });
    } catch (error) {
      logger.error('更新用户资料失败:', error.message);
      
      if (error.message === '没有有效的更新字段') {
        return res.status(400).json({
          error: 'ValidationError',
          message: error.message
        });
      }

      if (error.message === '用户不存在') {
        return res.status(404).json({
          error: 'NotFound',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'ServerError',
        message: '更新资料失败'
      });
    }
  }

  // 根据ID获取用户信息
  static async getUserById(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的用户ID'
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'NotFound',
          message: '用户不存在'
        });
      }

      // 返回公开信息（不包含敏感信息）
      const publicInfo = {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        gender: user.gender,
        age: user.age,
        city: user.city,
        membershipLevel: user.membership_level,
        createdAt: user.created_at
      };

      res.status(200).json({
        user: publicInfo
      });
    } catch (error) {
      logger.error('获取用户信息失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取用户信息失败'
      });
    }
  }

  // 搜索用户
  static async searchUsers(req, res) {
    try {
      const keyword = req.params.keyword;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      if (!keyword || keyword.trim().length < 2) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '搜索关键词至少需要2个字符'
        });
      }

      const users = await User.search(keyword.trim(), limit, offset);

      // 获取总数
      const countResult = await User.query(
        'SELECT COUNT(*) as total FROM users WHERE username ILIKE $1 OR bio ILIKE $1',
        [`%${keyword.trim()}%`]
      );

      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      logger.error('搜索用户失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '搜索失败'
      });
    }
  }

  // 关注用户
  static async followUser(req, res) {
    try {
      const followerId = req.user.id;
      const followingId = parseInt(req.params.userId);

      if (isNaN(followingId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的用户ID'
        });
      }

      if (followerId === followingId) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '不能关注自己'
        });
      }

      // 检查是否已关注
      const existingFollow = await User.query(
        'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, followingId]
      );

      if (existingFollow.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: '已关注该用户'
        });
      }

      // 添加关注
      await User.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [followerId, followingId]
      );

      logger.info(`用户 ${followerId} 关注了用户 ${followingId}`);

      res.status(201).json({
        message: '关注成功'
      });
    } catch (error) {
      logger.error('关注用户失败:', error.message);
      
      if (error.code === '23503') { // 外键约束错误
        return res.status(404).json({
          error: 'NotFound',
          message: '用户不存在'
        });
      }

      res.status(500).json({
        error: 'ServerError',
        message: '关注失败'
      });
    }
  }

  // 取消关注
  static async unfollowUser(req, res) {
    try {
      const followerId = req.user.id;
      const followingId = parseInt(req.params.userId);

      if (isNaN(followingId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的用户ID'
        });
      }

      // 删除关注关系
      const result = await User.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING id',
        [followerId, followingId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '未关注该用户'
        });
      }

      logger.info(`用户 ${followerId} 取消关注用户 ${followingId}`);

      res.status(200).json({
        message: '取消关注成功'
      });
    } catch (error) {
      logger.error('取消关注失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '取消关注失败'
      });
    }
  }

  // 获取关注列表
  static async getFollowing(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      if (isNaN(userId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的用户ID'
        });
      }

      // 获取关注用户列表
      const result = await User.query(
        `SELECT u.id, u.username, u.avatar, u.bio, u.membership_level, f.created_at as followed_at
         FROM follows f
         JOIN users u ON f.following_id = u.id
         WHERE f.follower_id = $1
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      // 获取总数
      const countResult = await User.query(
        'SELECT COUNT(*) as total FROM follows WHERE follower_id = $1',
        [userId]
      );

      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        following: result.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      logger.error('获取关注列表失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取关注列表失败'
      });
    }
  }

  // 获取粉丝列表
  static async getFollowers(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      if (isNaN(userId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的用户ID'
        });
      }

      // 获取粉丝列表
      const result = await User.query(
        `SELECT u.id, u.username, u.avatar, u.bio, u.membership_level, f.created_at as followed_at
         FROM follows f
         JOIN users u ON f.follower_id = u.id
         WHERE f.following_id = $1
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      // 获取总数
      const countResult = await User.query(
        'SELECT COUNT(*) as total FROM follows WHERE following_id = $1',
        [userId]
      );

      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        followers: result.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      logger.error('获取粉丝列表失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取粉丝列表失败'
      });
    }
  }

  // 管理员：获取所有用户
  static async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const result = await User.query(
        `SELECT id, username, email, phone, membership_level, is_active, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      // 获取总数
      const countResult = await User.query(
        'SELECT COUNT(*) as total FROM users'
      );

      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        users: result.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      logger.error('获取所有用户失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取用户列表失败'
      });
    }
  }

  // 管理员：更新用户状态
  static async updateUserStatus(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const { is_active } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的用户ID'
        });
      }

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'is_active必须为布尔值'
        });
      }

      const result = await User.query(
        'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, is_active',
        [is_active, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '用户不存在'
        });
      }

      const action = is_active ? '启用' : '禁用';
      logger.info(`管理员 ${req.user.id} ${action}了用户 ${userId}`);

      res.status(200).json({
        message: `用户状态更新成功`,
        user: result.rows[0]
      });
    } catch (error) {
      logger.error('更新用户状态失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '更新用户状态失败'
      });
    }
  }
}

module.exports = UserController;