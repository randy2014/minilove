const { query, transaction } = require('../config/database-wrapper');
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

class Comment {
  // 创建评论
  static async create(commentData) {
    const {
      post_id,
      user_id,
      parent_id = null,
      content
    } = commentData;

    const now = new Date().toISOString();

    const result = await transaction(async (client) => {
      // 插入评论
      const commentResult = await query(
        `INSERT INTO comments (post_id, user_id, parent_id, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, post_id, user_id, parent_id, content, likes_count, status, created_at, updated_at`,
        [post_id, user_id, parent_id, content, now, now]
      );

      // 更新帖子评论计数
      await query(
        `UPDATE posts SET comments_count = comments_count + 1, updated_at = $1 WHERE id = $2`,
        [now, post_id]
      );

      return commentResult.rows[0];
    });

    return result;
  }

  // 通过ID查找评论
  static async findById(id, options = {}) {
    const { includeAuthor = true, includePost = false } = options;
    
    let selectClause = `
      SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content,
             c.likes_count, c.status, c.created_at, c.updated_at
    `;

    const joins = [];
    const whereConditions = ['c.id = $1', "c.status = 'published'"];
    const params = [id];

    if (includeAuthor) {
      selectClause += `,
        u.username as author_username,
        u.avatar_url as author_avatar,
        u.membership_level as author_membership_level`;
      joins.push('LEFT JOIN users u ON c.user_id = u.id');
    }

    if (includePost) {
      selectClause += `,
        p.title as post_title,
        p.user_id as post_author_id`;
      joins.push('LEFT JOIN posts p ON c.post_id = p.id');
    }

    const result = await query(
      `${selectClause}
       FROM comments c
       ${joins.join(' ')}
       WHERE ${whereConditions.join(' AND ')}`,
      params
    );

    return result.rows[0];
  }

  // 获取帖子的评论列表
  static async findByPost(postId, options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'ASC',
      includeAuthor = true
    } = options;

    const offset = (page - 1) * limit;
    const whereConditions = ['c.post_id = $1', "c.status = 'published'", 'c.parent_id IS NULL'];
    const params = [postId];

    let selectClause = `
      SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content,
             c.likes_count, c.status, c.created_at, c.updated_at
    `;

    const joins = [];
    
    if (includeAuthor) {
      selectClause += `,
        u.username as author_username,
        u.avatar_url as author_avatar,
        u.membership_level as author_membership_level`;
      joins.push('LEFT JOIN users u ON c.user_id = u.id');
    }

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM comments c WHERE ${whereConditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 获取主评论
    const orderClause = `ORDER BY c.${sortBy} ${sortOrder}`;
    const mainCommentsResult = await query(
      `${selectClause}
       FROM comments c
       ${joins.join(' ')}
       WHERE ${whereConditions.join(' AND ')}
       ${orderClause}
       LIMIT $2 OFFSET $3`,
      [...params, limit, offset]
    );

    const mainComments = mainCommentsResult.rows;

    // 获取每个主评论的回复
    if (mainComments.length > 0) {
      const mainCommentIds = mainComments.map(c => c.id);
      
      // 获取所有回复
      const repliesResult = await query(
        `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content,
                c.likes_count, c.status, c.created_at, c.updated_at,
                u.username as author_username,
                u.avatar_url as author_avatar
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.post_id = $1 AND c.parent_id IN (${mainCommentIds.map((_, i) => `$${i + 2}`).join(',')})
         AND c.status = 'published'
         ORDER BY c.created_at ASC`,
        [postId, ...mainCommentIds]
      );

      const replies = repliesResult.rows;
      
      // 将回复分组到对应的主评论
      const replyMap = replies.reduce((map, reply) => {
        if (!map[reply.parent_id]) {
          map[reply.parent_id] = [];
        }
        map[reply.parent_id].push(reply);
        return map;
      }, {});

      // 添加回复到主评论
      mainComments.forEach(comment => {
        comment.replies = replyMap[comment.id] || [];
        comment.reply_count = comment.replies.length;
      });
    }

    return {
      comments: mainComments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  }

  // 获取用户的评论
  static async findByUser(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const whereConditions = ['c.user_id = $1', "c.status = 'published'"];
    const params = [userId];

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM comments c WHERE ${whereConditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const dataResult = await query(
      `SELECT c.id, c.post_id, c.parent_id, c.content,
              c.likes_count, c.created_at,
              p.title as post_title,
              u.username as post_author_username
       FROM comments c
       LEFT JOIN posts p ON c.post_id = p.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [...params, limit, offset]
    );

    return {
      comments: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  }

  // 更新评论
  static async update(id, userId, updateData) {
    const { content, status } = updateData;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('没有有效的字段可更新');
    }

    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());
    paramCount++;

    values.push(id, userId);
    paramCount += 2;

    const result = await query(
      `UPDATE comments
       SET ${updates.join(', ')}
       WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
       RETURNING id, post_id, user_id, parent_id, content, likes_count, status, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('评论不存在或无权修改');
    }

    return result.rows[0];
  }

  // 删除评论（软删除）
  static async delete(id, userId) {
    const result = await transaction(async (client) => {
      // 获取评论信息
      const commentResult = await query(
        `SELECT post_id FROM comments WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (commentResult.rows.length === 0) {
        throw new Error('评论不存在或无权删除');
      }

      const { post_id } = commentResult.rows[0];

      // 软删除：更新状态为deleted
      const updateResult = await query(
        `UPDATE comments
         SET status = 'deleted', updated_at = $1
         WHERE id = $2 AND user_id = $3
         RETURNING id, content`,
        [new Date().toISOString(), id, userId]
      );

      // 更新帖子评论计数
      await query(
        `UPDATE posts SET comments_count = comments_count - 1, updated_at = $1 WHERE id = $2`,
        [new Date().toISOString(), post_id]
      );

      return updateResult.rows[0];
    });

    return result;
  }

  // 点赞评论
  static async like(commentId, userId) {
    try {
      const result = await query(
        `INSERT INTO likes (user_id, comment_id, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, comment_id) DO NOTHING
         RETURNING id`,
        [userId, commentId, new Date().toISOString()]
      );

      return { success: result.rows.length > 0 };
    } catch (error) {
      if (error.code === '23505') { // 唯一约束违反
        return { success: false, error: '已点赞过此评论' };
      }
      throw error;
    }
  }

  // 取消点赞
  static async unlike(commentId, userId) {
    const result = await query(
      `DELETE FROM likes
       WHERE user_id = $1 AND comment_id = $2
       RETURNING id`,
      [userId, commentId]
    );

    return { success: result.rows.length > 0 };
  }

  // 获取评论统计数据
  static async getStats(id) {
    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM likes WHERE comment_id = $1) as total_likes,
        (SELECT COUNT(*) FROM comments WHERE parent_id = $1 AND status = 'published') as total_replies`,
      [id]
    );

    return {
      likes: parseInt(result.rows[0].total_likes) || 0,
      replies: parseInt(result.rows[0].total_replies) || 0
    };
  }

  // 获取热门评论
  static async getPopular(postId, limit = 10) {
    const result = await query(
      `SELECT c.id, c.user_id, c.content, c.likes_count, c.created_at,
              u.username as author_username,
              u.avatar_url as author_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 AND c.status = 'published' AND c.parent_id IS NULL
       ORDER BY c.likes_count DESC
       LIMIT $2`,
      [postId, limit]
    );

    return result.rows;
  }
}

module.exports = Comment;