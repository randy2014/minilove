// 数据库包装器，根据环境选择使用PostgreSQL或SQLite
const winston = require('winston');
const sqliteDb = require('./sqlite-database');

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

let pgDb = null;

// 动态加载PostgreSQL模块（仅在需要时）
async function getPostgresDb() {
  if (!pgDb) {
    try {
      const { Pool } = require('pg');
      
      // 数据库连接池配置
      const poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'minilove_dev',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };

      // 从环境变量DATABASE_URL解析配置
      if (process.env.DATABASE_URL) {
        try {
          const url = new URL(process.env.DATABASE_URL);
          poolConfig.user = url.username;
          poolConfig.password = url.password;
          poolConfig.host = url.hostname;
          poolConfig.port = url.port;
          poolConfig.database = url.pathname.substring(1);
          
          if (url.searchParams.get('sslmode')) {
            poolConfig.ssl = { rejectUnauthorized: url.searchParams.get('sslmode') === 'require' };
          }
        } catch (error) {
          logger.warn(`无法解析DATABASE_URL: ${error.message}`);
        }
      }

      pgDb = new Pool(poolConfig);
      
      // 测试连接
      const client = await pgDb.connect();
      try {
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        logger.info('PostgreSQL数据库连接成功', {
          time: result.rows[0].current_time,
          version: result.rows[0].version.split(' ')[0]
        });
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('PostgreSQL连接失败，回退到SQLite', { error: error.message });
      pgDb = null;
    }
  }
  return pgDb;
}

// 数据库适配器
class DatabaseAdapter {
  constructor() {
    this.useSqlite = process.env.USE_SQLITE === 'true' || !process.env.DATABASE_URL;
  }

  async init() {
    if (this.useSqlite) {
      logger.info('使用SQLite数据库');
      await sqliteDb.init();
      await sqliteDb.testConnection();
    } else {
      logger.info('尝试连接PostgreSQL数据库');
      const db = await getPostgresDb();
      if (!db) {
        logger.warn('PostgreSQL连接失败，切换到SQLite');
        this.useSqlite = true;
        await sqliteDb.init();
        await sqliteDb.testConnection();
      }
    }
  }

  async query(text, params) {
    if (this.useSqlite) {
      return await sqliteDb.query(text, params);
    } else {
      const db = await getPostgresDb();
      if (!db) {
        throw new Error('数据库连接不可用');
      }
      
      const start = Date.now();
      let client;
      
      try {
        client = await db.connect();
        const result = await client.query(text, params);
        const duration = Date.now() - start;
        
        logger.debug('数据库查询执行', {
          text: text.length > 100 ? text.substring(0, 100) + '...' : text,
          params,
          duration: `${duration}ms`,
          rows: result.rowCount
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error('数据库查询错误', {
          error: error.message,
          text: text.length > 100 ? text.substring(0, 100) + '...' : text,
          params,
          duration: `${duration}ms`
        });
        throw error;
      } finally {
        if (client) client.release();
      }
    }
  }

  async transaction(callback) {
    if (this.useSqlite) {
      return await sqliteDb.transaction(callback);
    } else {
      const db = await getPostgresDb();
      if (!db) {
        throw new Error('数据库连接不可用');
      }
      
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  async testConnection() {
    if (this.useSqlite) {
      return await sqliteDb.testConnection();
    } else {
      const db = await getPostgresDb();
      if (!db) {
        return false;
      }
      
      try {
        const client = await db.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
      } catch (error) {
        return false;
      }
    }
  }

  async close() {
    if (this.useSqlite) {
      return await sqliteDb.close();
    } else {
      const db = await getPostgresDb();
      if (db) {
        await db.end();
        logger.info('PostgreSQL连接池已关闭');
      }
    }
  }

  getPool() {
    return this.useSqlite ? sqliteDb : getPostgresDb();
  }
}

// 单例模式
const dbAdapter = new DatabaseAdapter();

module.exports = dbAdapter;