const bcrypt = require('bcryptjs');
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

class User {
  // 创建新用户
  static async create(userData) {
    const {
      username,
      email,
      password,
      phone,
      gender = 'unknown',
      age,
      city,
      bio = '',
      membership_level = 'free'
    } = userData;

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const now = new Date().toISOString();
    
    const result = await query(
      `INSERT INTO users (
        username, email, password_hash, phone,
        gender, age, city, bio, membership_level,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, username, email, phone, gender, age, city, bio, 
                membership_level, is_active, is_verified, created_at`,
      [
        username, email, passwordHash, phone,
        gender, age, city, bio, membership_level,
        now, now
      ]
    );

    return result.rows[0];
  }

  // 通过ID查找用户
  static async findById(id) {
    const result = await query(
      `SELECT id, username, email, phone, avatar_url, bio,
              gender, age, city, membership_level, membership_expires_at,
              posts_count, comments_count, likes_given_count, likes_received_count,
              is_active, is_verified, created_at, updated_at
       FROM users
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    return result.rows[0];
  }

  // 通过用户名或邮箱查找用户（用于登录）
  static async findByUsernameOrEmail(identifier) {
    const result = await query(
      `SELECT id, username, email, password_hash, phone, avatar_url, bio,
              gender, age, city, membership_level, membership_expires_at,
              posts_count, comments_count, likes_given_count, likes_received_count,
              is_active, is_verified, created_at, updated_at
       FROM users
       WHERE (username = $1 OR email = $1) AND is_active = true`,
      [identifier]
    );

    return result.rows[0];
  }

  // 通过邮箱查找用户
  static async findByEmail(email) {
    const result = await query(
      `SELECT id, username, email, phone, avatar_url, bio,
              gender, age, city, membership_level, membership_expires_at,
              is_active, is_verified, created_at, updated_at
       FROM users
       WHERE email = $1 AND is_active = true`,
      [email]
    );

    return result.rows[0];
  }

  // 检查用户名是否已存在
  static async usernameExists(username) {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE username = $1',
      [username]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  // 检查邮箱是否已存在
  static async emailExists(email) {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE email = $1',
      [email]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  // 检查手机号是否已存在
  static async phoneExists(phone) {
    if (!phone) return false;
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE phone = $1',
      [phone]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  // 更新用户信息
  static async update(id, updateData) {
    const allowedFields = [
      'username', 'email', 'phone', 'avatar_url', 'bio',
      'gender', 'age', 'city', 'membership_level', 'membership_expires_at',
      'is_active', 'is_verified'
    ];
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
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

    values.push(id);

    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, phone, avatar_url, bio,
                 gender, age, city, membership_level, membership_expires_at,
                 is_active, is_verified, created_at, updated_at`,
      values
    );

    return result.rows[0];
  }

  // 更新密码
  static async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const result = await query(
      `UPDATE users
       SET password_hash = $1, updated_at = $2
       WHERE id = $3
       RETURNING id, username, email`,
      [passwordHash, new Date().toISOString(), id]
    );

    return result.rows[0];
  }

  // 验证密码
  static async verifyPassword(userId, password) {
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return await bcrypt.compare(password, result.rows[0].password_hash);
  }

  // 删除用户（软删除）
  static async softDelete(id) {
    const result = await query(
      `UPDATE users
       SET is_active = false, updated_at = $1
       WHERE id = $2
       RETURNING id, username, email`,
      [new Date().toISOString(), id]
    );

    return result.rows[0];
  }

  // 获取用户列表（带分页）
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search,
      membershipLevel,
      city
    } = options;

    const offset = (page - 1) * limit;
    const whereConditions = ['is_active = true'];
    const params = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(username ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (membershipLevel) {
      whereConditions.push(`membership_level = $${paramCount}`);
      params.push(membershipLevel);
      paramCount++;
    }

    if (city) {
      whereConditions.push(`city ILIKE $${paramCount}`);
      params.push(`%${city}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 获取数据
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;
    const dataResult = await query(
      `SELECT id, username, email, phone, avatar_url, bio,
              gender, age, city, membership_level, membership_expires_at,
              posts_count, comments_count, likes_given_count, likes_received_count,
              is_active, is_verified, created_at, updated_at
       FROM users
       ${whereClause}
       ${orderClause}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return {
      users: dataResult.rows,
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

  // 获取用户统计数据
  static async getStats(id) {
    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND status = 'published') as total_posts,
        (SELECT COUNT(*) FROM comments WHERE user_id = $1 AND status = 'published') as total_comments,
        (SELECT COUNT(*) FROM likes WHERE user_id = $1) as total_likes_given,
        (SELECT COUNT(*) FROM likes l
          JOIN posts p ON l.post_id = p.id 
          WHERE p.user_id = $1) as total_likes_received_posts,
        (SELECT COUNT(*) FROM likes l
          JOIN comments c ON l.comment_id = c.id 
          WHERE c.user_id = $1) as total_likes_received_comments,
        (SELECT COUNT(*) FROM follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count`,
      [id]
    );

    const stats = result.rows[0];
    
    return {
      posts: parseInt(stats.total_posts) || 0,
      comments: parseInt(stats.total_comments) || 0,
      likesGiven: parseInt(stats.total_likes_given) || 0,
      likesReceived: (parseInt(stats.total_likes_received_posts) || 0) + 
                    (parseInt(stats.total_likes_received_comments) || 0),
      followers: parseInt(stats.followers_count) || 0,
      following: parseInt(stats.following_count) || 0
    };
  }

  // 更新用户活跃度
  static async updateLastActive(id) {
    // 这里可以记录用户最后活跃时间
    // 由于我们有last_active_at视图，实际上不需要单独更新
    // 这个方法留作未来扩展用
    return true;
  }

  // 验证用户凭证
  static async authenticate(identifier, password) {
    try {
      const user = await this.findByUsernameOrEmail(identifier);
      
      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return { success: false, error: '密码错误' };
      }

      // 移除密码哈希
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        success: true,
        user: userWithoutPassword
      };
    } catch (error) {
      logger.error('用户认证失败', { error: error.message, identifier });
      return { success: false, error: '认证失败' };
    }
  }
}

module.exports = User;