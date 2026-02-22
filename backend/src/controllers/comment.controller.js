// 评论控制器
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class CommentController {
  // 创建评论
  static async createComment(req, res) {
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
      const { postId, content, parentId, images } = req.body;

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

      // 检查访问权限
      if (post.visibility !== 'public') {
        if (post.visibility === 'private' && post.user_id !== userId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: '没有权限评论此内容'
          });
        }

        if (post.visibility === 'friends_only') {
          const friendCheck = await query(
            'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
            [userId, post.user_id]
          );

          if (friendCheck.rows.length === 0) {
            return res.status(403).json({
              error: 'Forbidden',
              message: '只有好友可以评论此内容'
            });
          }
        }
      }

      // 如果指定了父评论，检查父评论是否存在
      let parentComment = null;
      if (parentId) {
        const parentCheck = await query(
          'SELECT id, post_id FROM comments WHERE id = $1 AND status = \'published\'',
          [parentId]
        );

        if (parentCheck.rows.length === 0) {
          return res.status(404).json({
            error: 'NotFound',
            message: '父评论不存在'
          });
        }

        if (parentCheck.rows[0].post_id !== postId) {
          return res.status(400).json({
            error: 'ValidationError',
            message: '父评论不属于该帖子'
          });
        }

        parentComment = parentCheck.rows[0];
      }

      // 开始事务
      await query('BEGIN');

      // 创建评论
      const commentResult = await query(
        `INSERT INTO comments (
          post_id, user_id, parent_id, content, images
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, post_id, user_id, parent_id, content, images, 
                  likes_count, created_at`,
        [postId, userId, parentId || null, content, images || []]
      );

      // 更新帖子评论计数
      await query(
        'UPDATE posts SET comments_count = comments_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [postId]
      );

      await query('COMMIT');

      const comment = commentResult.rows[0];
      
      // 获取用户信息
      const userResult = await query(
        'SELECT username, avatar FROM users WHERE id = $1',
        [userId]
      );

      comment.author_username = userResult.rows[0].username;
      comment.author_avatar = userResult.rows[0].avatar;

      logger.info(`用户 ${userId} 在帖子 ${postId} 下创建了评论: ${comment.id}`);

      res.status(201).json({
        message: '评论创建成功',
        comment
      });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('创建评论失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '创建评论失败'
      });
    }
  }

  // 更新评论
  static async updateComment(req, res) {
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
      const commentId = parseInt(req.params.commentId);
      const { content, images } = req.body;

      if (isNaN(commentId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的评论ID'
        });
      }

      // 检查评论是否存在且属于当前用户
      const commentCheck = await query(
        'SELECT user_id, status FROM comments WHERE id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '评论不存在'
        });
      }

      const comment = commentCheck.rows[0];

      if (comment.user_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: '没有权限修改此评论'
        });
      }

      if (comment.status === 'deleted') {
        return res.status(400).json({
          error: 'ValidationError',
          message: '评论已被删除，无法修改'
        });
      }

      // 更新评论
      const updateResult = await query(
        `UPDATE comments 
         SET content = $1, images = $2, is_edited = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, post_id, user_id, parent_id, content, images, 
                   is_edited, updated_at`,
        [content, images || [], commentId]
      );

      const updatedComment = updateResult.rows[0];

      // 获取用户信息
      const userResult = await query(
        'SELECT username, avatar FROM users WHERE id = $1',
        [userId]
      );

      updatedComment.author_username = userResult.rows[0].username;
      updatedComment.author_avatar = userResult.rows[0].avatar;

      logger.info(`用户 ${userId} 更新了评论: ${commentId}`);

      res.status(200).json({
        message: '评论更新成功',
        comment: updatedComment
      });
    } catch (error) {
      logger.error('更新评论失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '更新评论失败'
      });
    }
  }

  // 删除评论
  static async deleteComment(req, res) {
    try {
      const userId = req.user.id;
      const commentId = parseInt(req.params.commentId);

      if (isNaN(commentId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的评论ID'
        });
      }

      // 检查评论是否存在且属于当前用户
      const commentCheck = await query(
        'SELECT user_id, post_id, status FROM comments WHERE id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '评论不存在'
        });
      }

      const comment = commentCheck.rows[0];

      if (comment.user_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: '没有权限删除此评论'
        });
      }

      if (comment.status === 'deleted') {
        return res.status(400).json({
          error: 'ValidationError',
          message: '评论已被删除'
        });
      }

      // 开始事务
      await query('BEGIN');

      // 软删除评论
      await query(
        'UPDATE comments SET status = \'deleted\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [commentId]
      );

      // 更新帖子评论计数
      await query(
        'UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [comment.post_id]
      );

      await query('COMMIT');

      logger.info(`用户 ${userId} 删除了评论: ${commentId}`);

      res.status(200).json({
        message: '评论删除成功'
      });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('删除评论失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '删除评论失败'
      });
    }
  }

  // 点赞评论
  static async likeComment(req, res) {
    try {
      const userId = req.user.id;
      const commentId = parseInt(req.params.commentId);

      if (isNaN(commentId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的评论ID'
        });
      }

      // 检查评论是否存在
      const commentCheck = await query(
        'SELECT id, status FROM comments WHERE id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'NotFound',
          message: '评论不存在'
        });
      }

      if (commentCheck.rows[0].status !== 'published') {
        return res.status(400).json({
          error: 'ValidationError',
          message: '评论不可用'
        });
      }

      // 检查是否已点赞
      const existingLike = await query(
        'SELECT id FROM likes WHERE user_id = $1 AND comment_id = $2',
        [userId, commentId]
      );

      if (existingLike.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: '已点赞该评论'
        });
      }

      // 开始事务
      await query('BEGIN');

      // 添加点赞
      await query(
        'INSERT INTO likes (user_id, comment_id) VALUES ($1, $2)',
        [userId, commentId]
      );

      // 更新评论点赞计数
      await query(
        'UPDATE comments SET likes_count = likes_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [commentId]
      );

      await query('COMMIT');

      logger.info(`用户 ${userId} 点赞了评论: ${commentId}`);

      res.status(201).json({
        message: '点赞成功'
      });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('点赞评论失败:', error.message);
      res.status(500).json({
        error: 'ServerError',
        message: '点赞失败'
      });
    }
  }

  // 取消点赞评论
  static async unlikeComment(req, res) {
    try {
      const userId = req.user.id;
      const commentId = parseInt(req.params.commentId);

      if (isNaN(commentId)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '无效的评论ID'
        });
      }

      // 开始事务
      await query('BEGIN');

      // 删除点赞
      const deleteResult = await query(
        'DELETE FROM likes WHERE user_id = $1 AND comment_id = $2 RETURNING id',
        [userId, commentId]
      );

      if (deleteResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({
          error: 'NotFound',
          message: '未点赞该评论'
        });
      }

      // 更新评论点赞计数
      await query(
        'UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [commentId]
      );

      await query('COMMIT');

      logger.info(`用户 ${userId} 取消点赞评论: ${commentId}`);

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
}

module.exports = CommentController;