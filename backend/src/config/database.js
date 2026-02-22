// 数据库连接配置
const { Pool } = require('pg');
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

// 数据库连接池配置
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'minilove_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// 从环境变量DATABASE_URL解析配置（如果存在）
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    poolConfig.user = url.username;
    poolConfig.password = url.password;
    poolConfig.host = url.hostname;
    poolConfig.port = url.port;
    poolConfig.database = url.pathname.substring(1); // 移除开头的斜杠
    
    // 解析查询参数
    if (url.searchParams.get('sslmode')) {
      poolConfig.ssl = { rejectUnauthorized: url.searchParams.get('sslmode') === 'require' };
    }
  } catch (error) {
    logger.warn(`无法解析DATABASE_URL: ${error.message}`);
  }
}

// 创建数据库连接池
const pool = new Pool(poolConfig);

// 测试数据库连接
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    logger.info('数据库连接成功', {
      time: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0]
    });
    return true;
  } catch (error) {
    logger.error('数据库连接失败', {
      error: error.message,
      config: {
        host: poolConfig.host,
        port: poolConfig.port,
        database: poolConfig.database,
        user: poolConfig.user
      }
    });
    return false;
  } finally {
    if (client) client.release();
  }
}

// 执行查询的通用函数
async function query(text, params) {
  const start = Date.now();
  let client;
  
  try {
    client = await pool.connect();
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

// 事务处理函数
async function transaction(callback) {
  const client = await pool.connect();
  
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

// 连接池事件监听
pool.on('connect', (client) => {
  logger.debug('新数据库连接建立');
});

pool.on('error', (error, client) => {
  logger.error('数据库连接池错误', { error: error.message });
});

pool.on('remove', (client) => {
  logger.debug('数据库连接移除');
});

// 应用关闭时清理连接池
process.on('SIGTERM', async () => {
  logger.info('关闭数据库连接池...');
  await pool.end();
  logger.info('数据库连接池已关闭');
});

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};