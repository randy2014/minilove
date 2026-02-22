const { query, transaction } = require('../config/database');
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

class Post {
  // 创建帖子
  static async create(postData) {
    const {
      user_id,
      title,
      content,
      images = [],
      category,
      tags = [],
      emotion_tags = [],
      visibility = 'public',
      status = 'published'
    } = postData;

    const now = new Date().toISOString();
    const published_at = status === 'published' ? now : null;

    const result = await transaction(async (client) => {
      // 插入帖子
      const postResult = await client.query(
        `INSERT INTO posts (
          user_id, title, content, images, category,
          tags, emotion_tags, visibility, status,
          published_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, user_id, title, content, images, category,
                  tags, emotion_tags, likes_count, comments_count, views_count,
                  visibility, status, published_at, created_at, updated_at`,
        [
          user_id, title, content, JSON.stringify(images), category,
          tags, emotion_tags, visibility, status,
          published_at, now, now
        ]
      );

      // 如果是已发布的帖子，更新话题统计
      if (status === 'published') {
        await client.query(
          `UPDATE topics 
           SET posts_count = posts_count + 1,
               updated_at = $1
           WHERE name = $2`,
          [now, category]
        );
      }

      return postResult.rows[0];
    });

    return result;
  }

  // 通过ID查找帖子
  static async findById(id, options = {}) {
    const { includeAuthor = true, includeLiked = false, userId } = options;
    
    let selectClause = `
      SELECT p.id, p.user_id, p.title, p.content, p.images, p.category,
             p.tags, p.emotion_tags, p.likes_count, p.comments_count, p.views_count,
             p.visibility, p.status, p.published_at, p.created_at, p.updated_at
    `;

    const joins = [];
    const whereConditions = ['p.id = $1', "p.status = 'published'"];
    const params = [id];
    let paramCount = 2;

    if (includeAuthor) {
      selectClause += `,
        u.username as author_username,
        u.avatar_url as author_avatar,
        u.membership_level as author_membership_level`;
      joins.push('LEFT JOIN users u ON p.user_id = u.id');
    }

    if (includeLiked && userId) {
      selectClause += `,
        EXISTS(
          SELECT 1 FROM likes l 
          WHERE l.post_id = p.id AND l.user_id = $${paramCount}
        ) as is_liked`;
      params.push(userId);
      paramCount++;
    }

    const result = await query(
      `${selectClause}
       FROM posts p
       ${joins.join(' ')}
       WHERE ${whereConditions.join(' AND ')}`,
      params
    );

    if (result.rows.length === 0) {
      return null;
    }

    const post = result.rows[0];
    
    // 解析数组字段
    if (post.tags && typeof post.tags === 'string') {
      post.tags = post.tags.split(',').map(tag => tag.trim());
    }
    
    if (post.emotion_tags && typeof post.emotion_tags === 'string') {
      post.emotion_tags = post.emotion_tags.split(',').map(tag => tag.trim());
    }
    
    if (post.images && typeof post.images === 'string') {
      try {
        post.images = JSON.parse(post.images);
      } catch (e) {
        post.images = [];
      }
    }

    // 增加浏览量
    if (!options.skipViewIncrement) {
      await query(
        'UPDATE posts SET views_count = views_count + 1 WHERE id = $1',
        [id]
      );
      post.views_count = (post.views_count || 0) + 1;
    }

    return post;
  }

  // 获取帖子列表
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      userId,
      tags,
      emotionTags,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search,
      includeAuthor = true
    } = options;

    const offset = (page - 1) * limit;
    const whereConditions = ["p.status = 'published'", "p.visibility = 'public'"];
    const params = [];
    let paramCount = 1;

    if (category) {
      whereConditions.push(`p.category = $${paramCount}`);
      params.push(category);
      paramCount++;
    }

    if (userId) {
      whereConditions.push(`p.user_id = $${paramCount}`);
      params.push(userId);
      paramCount++;
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map((tag, index) => 
        `$${paramCount + index} = ANY(p.tags)`
      );
      whereConditions.push(`(${tagConditions.join(' OR ')})`);
      params.push(...tags);
      paramCount += tags.length;
    }

    if (emotionTags && emotionTags.length > 0) {
      const emotionConditions = emotionTags.map((tag, index) => 
        `$${paramCount + index} = ANY(p.emotion_tags)`
      );
      whereConditions.push(`(${emotionConditions.join(' OR ')})`);
      params.push(...emotionTags);
      paramCount += emotionTags.length;
    }

    if (search) {
      whereConditions.push(`(p.title ILIKE $${paramCount} OR p.content ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    let selectClause = `
      SELECT p.id, p.user_id, p.title, 
             SUBSTRING(p.content, 1, 200) as content_preview,
             p.images, p.category, p.tags, p.emotion_tags,
             p.likes_count, p.comments_count, p.views_count,
             p.visibility, p.status, p.published_at, p.created_at, p.updated_at
    `;

    if (includeAuthor) {
      selectClause += `,
        u.username as author_username,
        u.avatar_url as author_avatar,
        u.membership_level as author_membership_level`;
    }

    const joins = includeAuthor ? ['LEFT JOIN users u ON p.user_id = u.id'] : [];
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    const orderClause = `ORDER BY p.${sortBy} ${sortOrder}`;

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const dataResult = await query(
      `${selectClause}
       FROM posts p
       ${joins.join(' ')}
       ${whereClause}
       ${orderClause}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    // 处理结果
    const posts = dataResult.rows.map(post => {
      // 解析数组字段
      if (post.tags && typeof post.tags === 'string') {
        post.tags = post.tags.split(',').map(tag => tag.trim());
      }
      
      if (post.emotion_tags && typeof post.emotion_tags === 'string') {
        post.emotion_tags = post.emotion_tags.split(',').map(tag => tag.trim());
      }
      
      if (post.images && typeof post.images === 'string') {
        try {
          post.images = JSON.parse(post.images);
        } catch (e) {
          post.images = [];
        }
      }

      return post;
    });

    return {
      posts,
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

  // 更新帖子
  static async update(id, userId, updateData) {
    const allowedFields = [
      'title', 'content', 'images', 'category', 'tags',
      'emotion_tags', 'visibility', 'status'
    ];
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'images') {
          updates.push(`${key} = $${paramCount}::jsonb`);
          values.push(JSON.stringify(value));
        } else if (key === 'tags' || key === 'emotion_tags') {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
        } else {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('没有有效的字段可更新');
    }

    // 添加更新时间戳
    updates.push('updated_at = $' + paramCount);
    values.push(new Date().toISOString());
    paramCount++;

    // 如果是发布状态变化，更新published_at
    if (updateData.status === 'published') {
      updates.push('published_at = $' + paramCount);
      values.push(new Date().toISOString());
      paramCount++;
    }

    values.push(id, userId);
    paramCount += 2;

    const result = await query(
      `UPDATE posts
       SET ${updates.join(', ')}
       WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
       RETURNING id, user_id, title, content, images, category,
                 tags, emotion_tags, likes_count, comments_count, views_count,
                 visibility, status, published_at, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('帖子不存在或无权修改');
    }

    return result.rows[0];
  }

  // 删除帖子
  static async delete(id, userId) {
    const result = await transaction(async (client) => {
      // 获取帖子信息
      const postResult = await client.query(
        `SELECT category, status FROM posts WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (postResult.rows.length === 0) {
        throw new Error('帖子不存在或无权删除');
      }

      const { category, status } = postResult.rows[0];

      // 软删除：更新状态为hidden
      const updateResult = await client.query(
        `UPDATE posts
         SET status = 'hidden', updated_at = $1
         WHERE id = $2 AND user_id = $3
         RETURNING id, title`,
        [new Date().toISOString(), id, userId]
      );

      // 如果是已发布的帖子，更新话题统计
      if (status === 'published') {
        await client.query(
          `UPDATE topics 
           SET posts_count = posts_count - 1,
               updated_at = $1
           WHERE name = $2`,
          [new Date().toISOString(), category]
        );
      }

      return updateResult.rows[0];
    });

    return result;
  }

  // 点赞帖子
  static async like(postId, userId) {
    try {
      const result = await query(
        `INSERT INTO likes (user_id, post_id, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, post_id) DO NOTHING
         RETURNING id`,
        [userId, postId, new Date().toISOString()]
      );

      return { success: result.rows.length > 0 };
    } catch (error) {
      if (error.code === '23505') { // 唯一约束违反
        return { success: false, error: '已点赞过此帖子' };
      }
      throw error;
    }
  }

  // 取消点赞
  static async unlike(postId, userId) {
    const result = await query(
      `DELETE FROM likes
       WHERE user_id = $1 AND post_id = $2
       RETURNING id`,
      [userId, postId]
    );

    return { success: result.rows.length > 0 };
  }

  // 获取热门帖子
  static async getPopular(options = {}) {
    const { limit = 10, timeframe = 'week' } = options;
    
    let timeframeCondition = '';
    if (timeframe === 'day') {
      timeframeCondition = 'AND p.created_at >= NOW() - INTERVAL \'1 day\'';
    } else if (timeframe === 'week') {
      timeframeCondition = 'AND p.created_at >= NOW() - INTERVAL \'7 days\'';
    } else if (timeframe === 'month') {
      timeframeCondition = 'AND p.created_at >= NOW() - INTERVAL \'30 days\'';
    }

    const result = await query(
      `SELECT p.id, p.user_id, p.title, 
              SUBSTRING(p.content, 1, 150) as content_preview,
              p.category, p.tags, p.likes_count, p.comments_count, p.views_count,
              p.created_at,
              u.username as author_username,
              u.avatar_url as author_avatar
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.status = 'published' 
         AND p.visibility = 'public'
         ${timeframeCondition}
       ORDER BY (p.likes_count * 0.4 + p.comments_count * 0.3 + p.views_count * 0.3) DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  // 获取用户发布的帖子
  static async findByUser(userId, options = {}) {
    const { page = 1, limit = 20, includePrivate = false } = options;
    const offset = (page - 1) * limit;

    const whereConditions = ['p.user_id = $1'];
    const params = [userId];
    let paramCount = 2;

    if (!includePrivate) {
      whereConditions.push("p.status = 'published'", "p.visibility = 'public'");
    } else {
      whereConditions.push("p.status != 'hidden'");
    }

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM posts p WHERE ${whereConditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const dataResult = await query(
      `SELECT p.id, p.title, 
              SUBSTRING(p.content, 1, 200) as content_preview,
              p.category, p.tags, p.likes_count, p.comments_count, p.views_count,
              p.visibility, p.status, p.created_at, p.updated_at
       FROM posts p
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return {
      posts: dataResult.rows,
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
}

module.exports = Post;