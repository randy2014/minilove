// 帖子控制器
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class PostController {
  // 获取所有帖子
  static async getAllPosts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const category = req.query.category;
      const tag = req.query.tag;
      const userId = req.user ? req.user.id : null;

      let queryText = `
        SELECT p.*, 
               u.username as author_username, 
               u.avatar as author_avatar,
               CASE WHEN l.user_id IS NOT NULL THEN TRUE ELSE FALSE END as liked,
               CASE WHEN b.user_id IS NOT NULL THEN TRUE ELSE FALSE END as bookmarked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $1
        LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $1
        WHERE p.status = 'published' AND p.visibility = 'public'
      `;
      
      const queryParams = [userId];
      let paramIndex = 2;

      if (category) {
        queryText += ` AND p.category = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }

      if (tag) {
        queryText += ` AND $${paramIndex} = ANY(p.tags)`;
        queryParams.push(tag);
        paramIndex++;
      }

      queryText += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);

      // 获取总数
      let countText = 'SELECT COUNT(*) as total FROM posts p WHERE p.status = \'published\' AND p.visibility = \'public\'';
      const countParams = [];
      let countParamIndex = 1;

      if (category) {
        countText += ` AND p.category = $${countParamIndex}`;
        countParams.push(category);
        countParamIndex++;
      }

      if (tag) {
        countText += ` AND $${countParamIndex} = ANY(p.tags)`;
        countParams.push(tag);
        countParamIndex++;
      }

      const countResult = await query(countText, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        posts: result.rows,
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
      logger.error('获取帖子列表失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取帖子失败'
      });
    }
  }

  // 获取推荐帖子
  static async getFeaturedPosts(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const limit = parseInt(req.query.limit) || 10;

      const result = await query(
        `SELECT p.*, 
                u.username as author_username, 
                u.avatar as author_avatar,
                CASE WHEN l.user_id IS NOT NULL THEN TRUE ELSE FALSE END as liked,
                CASE WHEN b.user_id IS NOT NULL THEN TRUE ELSE FALSE END as bookmarked
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $1
         LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $1
         WHERE p.status = 'published' AND p.visibility = 'public' AND p.is_featured = TRUE
         ORDER BY p.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      res.status(200).json({
        posts: result.rows
      });
    } catch (error) {
      logger.error('获取推荐帖子失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取推荐帖子失败'
      });
    }
  }

  // 获取热门帖子
  static async getTrendingPosts(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const limit = parseInt(req.query.limit) || 10;
      const timeframe = req.query.timeframe || 'day'; // day, week, month

      let timeFilter = 'INTERVAL \'24 hours\'';
      if (timeframe === 'week') timeFilter = 'INTERVAL \'7 days\'';
      if (timeframe === 'month') timeFilter = 'INTERVAL \'30 days\'';

      const result = await query(
        `SELECT p.*, 
                u.username as author_username, 
                u.avatar as author_avatar,
                CASE WHEN l.user_id IS NOT NULL THEN TRUE ELSE FALSE END as liked,
                CASE WHEN b.user_id IS NOT NULL THEN TRUE ELSE FALSE END as bookmarked,
                (p.likes_count * 2 + p.comments_count * 3 + p.views_count) as popularity_score
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $1
         LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $1
         WHERE p.status = 'published' AND p.visibility = 'public' 
               AND p.created_at > NOW() - ${timeFilter}
         ORDER BY popularity_score DESC, p.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      res.status(200).json({
        posts: result.rows
      });
    } catch (error) {
      logger.error('获取热门帖子失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取热门帖子失败'
      });
    }
  }

  // 根据ID获取帖子
  static async getPostById(req, res) {
    try {
      const postId = parseInt(req.params.postId);
      const userId = req.user ? req.user.id : null;

      if (isNaN(postId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的帖子ID'
        });
      }

      // 增加浏览量
      await query(
        'UPDATE posts SET views_count = views_count + 1 WHERE id = $1',
        [postId]
      );

      const result = await query(
        `SELECT p.*, 
                u.username as author_username, 
                u.avatar as author_avatar,
                u.id as author_id,
                CASE WHEN l.user_id IS NOT NULL THEN TRUE ELSE FALSE END as liked,
                CASE WHEN b.user_id IS NOT NULL THEN TRUE ELSE FALSE END as bookmarked
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $1
         LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $1
         WHERE p.id = $2 AND p.status = 'published'`,
        [userId, postId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '帖子不存在或已被删除'
        });
      }

      const post = result.rows[0];

      // 检查访问权限
      if (post.visibility !== 'public') {
        if (!userId) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: '需要登录才能查看此内容'
          });
        }

        if (post.visibility === 'private' && post.user_id !== userId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: '没有权限查看此内容'
          });
        }

        if (post.visibility === 'friends_only') {
          // 检查是否为好友
          const friendCheck = await query(
            'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
            [userId, post.user_id]
          );

          if (friendCheck.rows.length === 0) {
            return res.status(403).json({
              error: 'Forbidden',
              message: '只有好友可以查看此内容'
            });
          }
        }
      }

      res.status(200).json({
        post
      });
    } catch (error) {
      logger.error('获取帖子详情失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取帖子失败'
      });
    }
  }

  // 获取帖子评论
  static async getPostComments(req, res) {
    try {
      const postId = parseInt(req.params.postId);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      if (isNaN(postId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的帖子ID'
        });
      }

      // 检查帖子是否存在且可见
      const postCheck = await query(
        'SELECT id, visibility, user_id FROM posts WHERE id = $1 AND status = \'published\'',
        [postId]
      );

      if (postCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '帖子不存在'
        });
      }

      const post = postCheck.rows[0];

      // 获取评论
      const result = await query(
        `SELECT c.*, 
                u.username as author_username, 
                u.avatar as author_avatar
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id = $1 AND c.status = 'published'
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [postId, limit, offset]
      );

      // 获取评论总数
      const countResult = await query(
        'SELECT COUNT(*) as total FROM comments WHERE post_id = $1 AND status = \'published\'',
        [postId]
      );

      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        comments: result.rows,
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
      logger.error('获取评论失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取评论失败'
      });
    }
  }

  // 获取用户帖子
  static async getUserPosts(req, res) {
    try {
      const targetUserId = parseInt(req.params.userId);
      const currentUserId = req.user ? req.user.id : null;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      if (isNaN(targetUserId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的用户ID'
        });
      }

      let queryText = `
        SELECT p.*, 
               u.username as author_username, 
               u.avatar as author_avatar,
               CASE WHEN l.user_id IS NOT NULL THEN TRUE ELSE FALSE END as liked,
               CASE WHEN b.user_id IS NOT NULL THEN TRUE ELSE FALSE END as bookmarked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $1
        LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $1
        WHERE p.user_id = $2 AND p.status = 'published'
      `;

      const queryParams = [currentUserId, targetUserId];
      let paramIndex = 3;

      // 如果不是查看自己的帖子，需要过滤可见性
      if (currentUserId !== targetUserId) {
        queryText += ` AND (p.visibility = 'public' OR 
                           (p.visibility = 'friends_only' AND EXISTS (
                             SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2
                           )))`;
      }

      queryText += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);

      // 获取总数
      let countText = `SELECT COUNT(*) as total FROM posts p WHERE p.user_id = $1 AND p.status = 'published'`;
      const countParams = [targetUserId];

      if (currentUserId !== targetUserId) {
        countText += ` AND (p.visibility = 'public' OR 
                           (p.visibility = 'friends_only' AND EXISTS (
                             SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1
                           )))`;
        countParams.push(currentUserId);
      }

      const countResult = await query(countText, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        posts: result.rows,
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
      logger.error('获取用户帖子失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取用户帖子失败'
      });
    }
  }

  // 创建帖子
  static async createPost(req, res) {
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
      const { title, content, category, tags, images, visibility = 'public' } = req.body;

      // 分析情感标签
      const emotionTags = await this.analyzeEmotionTags(content);

      const result = await query(
        `INSERT INTO posts (
          user_id, title, content, images, category, tags, 
          visibility, emotion_tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, title, content, images, category, tags, 
                  visibility, status, created_at`,
        [userId, title, content, images || [], category, tags || [], visibility, emotionTags]
      );

      const post = result.rows[0];

      logger.info(`用户 ${userId} 创建了帖子: ${post.id}`);

      res.status(201).json({
        message: '帖子创建成功',
        post
      });
    } catch (error) {
      logger.error('创建帖子失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '创建帖子失败'
      });
    }
  }

  // 更新帖子
  static async updatePost(req, res) {
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
      const postId = parseInt(req.params.postId);
      const updateData = req.body;

      if (isNaN(postId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的帖子ID'
        });
      }

      // 检查帖子是否存在且属于当前用户
      const postCheck = await query(
        'SELECT user_id FROM posts WHERE id = $1',
        [postId]
      );

      if (postCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '帖子不存在'
        });
      }

      if (postCheck.rows[0].user_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: '没有权限修改此帖子'
        });
      }

      // 构建更新语句
      const allowedUpdates = ['title', 'content', 'category', 'tags', 'images', 'visibility', 'status'];
      const updates = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key) && updateData[key] !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '没有有效的更新字段'
        });
      }

      // 如果更新了内容，重新分析情感标签
      if (updateData.content) {
        const emotionTags = await this.analyzeEmotionTags(updateData.content);
        updates.push(`emotion_tags = $${paramIndex}`);
        values.push(emotionTags);
        paramIndex++;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(postId);

      const queryText = `
        UPDATE posts 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING id, title, content, images, category, tags, 
                  visibility, status, emotion_tags, updated_at
      `;

      const result = await query(queryText, values);

      logger.info(`用户 ${userId} 更新了帖子: ${postId}`);

      res.status(200).json({
        message: '帖子更新成功',
        post: result.rows[0]
      });
    } catch (error) {
      logger.error('更新帖子失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '更新帖子失败'
      });
    }
  }

  // 删除帖子
  static async deletePost(req, res) {
    try {
      const userId = req.user.id;
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的帖子ID'
        });
      }

      // 检查帖子是否存在且属于当前用户
      const postCheck = await query(
        'SELECT user_id FROM posts WHERE id = $1',
        [postId]
      );

      if (postCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '帖子不存在'
        });
      }

      if (postCheck.rows[0].user_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: '没有权限删除此帖子'
        });
      }

      // 软删除（更新状态）
      await query(
        'UPDATE posts SET status = \'deleted\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [postId]
      );

      logger.info(`用户 ${userId} 删除了帖子: ${postId}`);

      res.status(200).json({
        message: '帖子删除成功'
      });
    } catch (error) {
      logger.error('删除帖子失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '删除帖子失败'
      });
    }
  }

  // 点赞帖子
  static async likePost(req, res) {
    try {
      const userId = req.user.id;
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的帖子ID'
        });
      }

      // 检查帖子是否存在
      const postCheck = await query(
        'SELECT id FROM posts WHERE id = $1 AND status = \'published\'',
        [postId]
      );

      if (postCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '帖子不存在'
        });
      }

      // 检查是否已点赞
      const existingLike = await query(
        'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );

      if (existingLike.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: '已点赞该帖子'
        });
      }

      // 添加点赞并更新计数
      await query('BEGIN');
      
      await query(
        'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );

      await query(
        'UPDATE posts SET likes_count = likes_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [postId]
      );

      await query('COMMIT');

      logger.info(`用户 ${userId} 点赞了帖子: ${postId}`);

      res.status(201).json({
        message: '点赞成功'
      });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('点赞帖子失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '点赞失败'
      });
    }
  }

  // 取消点赞
  static async unlikePost(req, res) {
    try {
      const userId = req.user.id;
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的帖子ID'
        });
      }

      // 删除点赞并更新计数
      await query('BEGIN');
      
      const deleteResult = await query(
        'DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING id',
        [userId, postId]
      );

      if (deleteResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({
          error: 'NotFound',
          message: '未点赞该帖子'
        });
      }

      await query(
        'UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [postId]
      );

      await query('COMMIT');

      logger.info(`用户 ${userId} 取消点赞帖子: ${postId}`);

      res.status(200).json({
        message: '取消点赞成功'
      });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('取消点赞失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '取消点赞失败'
      });
    }
  }

  // 收藏帖子
  static async bookmarkPost(req, res) {
    try {
      const userId = req.user.id;
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的帖子ID'
        });
      }

      // 检查帖子是否存在
      const postCheck = await query(
        'SELECT id FROM posts WHERE id = $1 AND status = \'published\'',
        [postId]
      );

      if (postCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '帖子不存在'
        });
      }

      // 检查是否已收藏
      const existingBookmark = await query(
        'SELECT id FROM bookmarks WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );

      if (existingBookmark.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: '已收藏该帖子'
        });
      }

      // 添加收藏
      await query(
        'INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );

      logger.info(`用户 ${userId} 收藏了帖子: ${postId}`);

      res.status(201).json({
        message: '收藏成功'
      });
    } catch (error) {
      logger.error('收藏帖子失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '收藏失败'
      });
    }
  }

  // 取消收藏
  static async unbookmarkPost(req, res) {
    try {
      const userId = req.user.id;
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的帖子ID'
        });
      }

      // 删除收藏
      const deleteResult = await query(
        'DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2 RETURNING id',
        [userId, postId]
      );

      if (deleteResult.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '未收藏该帖子'
        });
      }

      logger.info(`用户 ${userId} 取消收藏帖子: ${postId}`);

      res.status(200).json({
        message: '取消收藏成功'
      });
    } catch (error) {
      logger.error('取消收藏失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '取消收藏失败'
      });
    }
  }

  // 获取会员专属内容
  static async getPremiumFeed(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const result = await query(
        `SELECT p.*, 
                u.username as author_username, 
                u.avatar as author_avatar,
                CASE WHEN l.user_id IS NOT NULL THEN TRUE ELSE FALSE END as liked,
                CASE WHEN b.user_id IS NOT NULL THEN TRUE ELSE FALSE END as bookmarked
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $1
         LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $1
         WHERE p.status = 'published' AND p.visibility = 'public'
               AND (p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1) 
                    OR p.is_featured = TRUE)
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      // 获取总数
      const countResult = await query(
        `SELECT COUNT(*) as total 
         FROM posts p
         WHERE p.status = 'published' AND p.visibility = 'public'
               AND (p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1) 
                    OR p.is_featured = TRUE)`,
        [userId]
      );

      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        posts: result.rows,
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
      logger.error('获取会员专属内容失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取内容失败'
      });
    }
  }

  // 获取会员专属话题
  static async getPremiumTopics(req, res) {
    try {
      const result = await query(
        `SELECT t.*, 
                (SELECT COUNT(*) FROM posts p 
                 JOIN post_topics pt ON p.id = pt.post_id 
                 WHERE pt.topic_id = t.id AND p.status = 'published') as recent_posts_count
         FROM topics t
         WHERE t.is_active = TRUE AND t.is_featured = TRUE
         ORDER BY t.participants_count DESC
         LIMIT 10`
      );

      res.status(200).json({
        topics: result.rows
      });
    } catch (error) {
      logger.error('获取会员专属话题失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '获取话题失败'
      });
    }
  }

  // 分析情感标签（简化版）
  static async analyzeEmotionTags(content) {
    // 这里可以实现更复杂的情感分析
    // 暂时使用简单的关键词匹配
    const positiveWords = ['开心', '快乐', '幸福', '满足', '成功', '进步', '希望', '爱'];
    const negativeWords = ['难过', '悲伤', '痛苦', '失望', '失败', '焦虑', '压力', '孤独'];
    
    const tags = [];
    const contentLower = content.toLowerCase();
    
    positiveWords.forEach(word => {
      if (contentLower.includes(word.toLowerCase())) {
        tags.push('积极');
      }
    });
    
    negativeWords.forEach(word => {
      if (contentLower.includes(word.toLowerCase())) {
        tags.push('消极');
      }
    });
    
    // 去重
    return Array.from(new Set(tags));
  }
}

module.exports = PostController;