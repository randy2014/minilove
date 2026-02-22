// SQLite数据库适配器（开发环境使用）
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');

// 创建日志记录器
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

class SQLiteDatabase {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../../data/minilove_dev.db');
  }

  // 初始化数据库
  async init() {
    try {
      // 确保数据库目录存在
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });
      
      // 打开数据库连接
      this.db = new sqlite3.Database(this.dbPath);
      
      // 将回调风格转换为Promise
      this.db.run = promisify(this.db.run.bind(this.db));
      this.db.get = promisify(this.db.get.bind(this.db));
      this.db.all = promisify(this.db.all.bind(this.db));
      this.db.exec = promisify(this.db.exec.bind(this.db));
      
      // 创建表
      await this.createTables();
      
      logger.info('SQLite数据库初始化成功', { path: this.dbPath });
      return true;
    } catch (error) {
      logger.error('SQLite数据库初始化失败', { error: error.message });
      throw error;
    }
  }

  // 创建所有表
  async createTables() {
    await this.db.exec(`
      -- 用户表
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        
        -- 个人信息
        avatar_url TEXT,
        bio TEXT,
        gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unknown')),
        age INTEGER,
        city TEXT,
        
        -- 会员信息
        membership_level TEXT DEFAULT 'free' CHECK (membership_level IN ('free', 'basic', 'premium')),
        membership_expires_at TEXT,
        
        -- 统计信息
        posts_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        likes_given_count INTEGER DEFAULT 0,
        likes_received_count INTEGER DEFAULT 0,
        
        -- 状态
        is_active INTEGER DEFAULT 1,
        is_verified INTEGER DEFAULT 0,
        
        -- 元数据
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_membership ON users(membership_level);

      -- 帖子表
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        
        -- 内容
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        images TEXT DEFAULT '[]',
        
        -- 分类标签
        category TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        emotion_tags TEXT DEFAULT '[]',
        
        -- 统计
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        
        -- 可见性
        visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
        status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'hidden')),
        
        -- 时间
        published_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- 帖子索引
      CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
      CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
      CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

      -- 评论表
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        parent_id INTEGER,
        
        -- 内容
        content TEXT NOT NULL,
        
        -- 统计
        likes_count INTEGER DEFAULT 0,
        
        -- 状态
        status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
        
        -- 时间
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      );

      -- 评论索引
      CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

      -- 话题表
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        cover_image TEXT,
        
        -- 统计
        posts_count INTEGER DEFAULT 0,
        participants_count INTEGER DEFAULT 0,
        
        -- 状态
        is_active INTEGER DEFAULT 1,
        is_featured INTEGER DEFAULT 0,
        
        -- 时间
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- 话题索引
      CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);
      CREATE INDEX IF NOT EXISTS idx_topics_featured ON topics(is_featured);

      -- 点赞表
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER,
        comment_id INTEGER,
        
        -- 时间
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        
        -- 检查只有一个目标
        CHECK ((post_id IS NOT NULL) + (comment_id IS NOT NULL) = 1),
        
        -- 唯一约束
        UNIQUE(user_id, post_id, comment_id),
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
      );

      -- 点赞索引
      CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
      CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_likes_comment ON likes(comment_id);

      -- 会员套餐表
      CREATE TABLE IF NOT EXISTS membership_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        duration_days INTEGER NOT NULL,
        
        -- 功能
        features TEXT DEFAULT '{}',
        
        -- 状态
        is_active INTEGER DEFAULT 1,
        
        -- 时间
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- 插入默认数据
      INSERT OR IGNORE INTO membership_plans (name, description, price, duration_days, features) VALUES
      ('免费会员', '基础功能，无限制内容浏览', 0.00, 9999, '{"max_posts_per_day": 3, "can_comment": true, "can_like": true, "basic_content_access": true}'),
      ('基础会员', '增强社交功能，更多发布权限', 29.90, 30, '{"max_posts_per_day": 10, "can_comment": true, "can_like": true, "content_access": "all", "priority_support": false, "custom_avatar": true}'),
      ('高级会员', '全方位服务，个性化支持', 89.90, 30, '{"max_posts_per_day": 30, "can_comment": true, "can_like": true, "content_access": "all", "priority_support": true, "custom_avatar": true, "one_on_one_support": true, "advanced_analytics": true}');

      -- 插入默认话题
      INSERT OR IGNORE INTO topics (name, description, is_featured, posts_count, participants_count) VALUES
      ('情感倾诉', '分享你的心情故事，寻找共鸣', 1, 25, 120),
      ('目标规划', '如何找到人生方向，设定可实现的目标', 1, 18, 85),
      ('晚间闲聊', '夜深人静时的随性交流', 1, 42, 210),
      ('单身生活', '独处时光的分享与建议', 1, 15, 75),
      ('工作压力', '职场中的困惑与解压', 1, 28, 140);

      -- 创建测试用户（如果不存在）
      INSERT OR IGNORE INTO users (username, email, password_hash, membership_level, is_verified) VALUES
      ('test_user', 'test@minilove.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye/HZjHj3QHwE6g9.2qVq9QqN6kYzWJmW', 'free', 1),
      ('premium_user', 'premium@minilove.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye/HZjHj3QHwE6g9.2qVq9QqN6kYzWJmW', 'premium', 1);
    `);
  }

  // 通用查询方法
  async query(text, params = []) {
    const start = Date.now();
    
    try {
      // 检查是SELECT查询还是其他操作
      const isSelect = text.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const result = await this.db.all(text, params);
        const duration = Date.now() - start;
        
        logger.debug('SQLite查询执行', {
          text: text.length > 100 ? text.substring(0, 100) + '...' : text,
          params,
          duration: `${duration}ms`,
          rows: result.length
        });
        
        return { rows: result, rowCount: result.length };
      } else {
        const result = await this.db.run(text, params);
        const duration = Date.now() - start;
        
        logger.debug('SQLite操作执行', {
          text: text.length > 100 ? text.substring(0, 100) + '...' : text,
          params,
          duration: `${duration}ms`,
          changes: result.changes
        });
        
        // SQLite的run方法返回包含lastID和changes的对象
        return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastID };
      }
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('SQLite查询错误', {
        error: error.message,
        text: text.length > 100 ? text.substring(0, 100) + '...' : text,
        params,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  // 事务处理
  async transaction(callback) {
    try {
      await this.db.exec('BEGIN TRANSACTION');
      const result = await callback(this);
      await this.db.exec('COMMIT');
      return result;
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  // 测试连接
  async testConnection() {
    try {
      const result = await this.db.get('SELECT datetime("now") as current_time, sqlite_version() as version');
      logger.info('SQLite数据库连接成功', {
        time: result.current_time,
        version: result.version
      });
      return true;
    } catch (error) {
      logger.error('SQLite数据库连接失败', { error: error.message });
      return false;
    }
  }

  // 关闭连接
  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          logger.error('关闭SQLite连接失败', { error: err.message });
          reject(err);
        } else {
          logger.info('SQLite连接已关闭');
          resolve();
        }
      });
    });
  }
}

// 单例模式
const sqliteInstance = new SQLiteDatabase();

module.exports = sqliteInstance;