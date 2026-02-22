// 测试数据库连接脚本
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

async function testSQLiteConnection() {
  const dbPath = path.join(__dirname, '../data/minilove_dev.db');
  
  console.log('🔍 测试SQLite数据库连接...');
  console.log(`📁 数据库路径: ${dbPath}`);
  
  try {
    // 检查数据库文件是否存在
    try {
      await fs.access(dbPath);
      console.log('✅ 数据库文件存在');
    } catch (error) {
      console.log('⚠️  数据库文件不存在，将创建新数据库');
    }
    
    // 创建数据库连接
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ 连接数据库失败:', err.message);
        return;
      }
      console.log('✅ 成功连接到SQLite数据库');
    });
    
    // 测试查询
    db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
      if (err) {
        console.error('❌ 查询失败:', err.message);
      } else {
        console.log('📊 数据库中的表:');
        if (tables.length === 0) {
          console.log('   - 没有表（需要初始化）');
        } else {
          tables.forEach(table => {
            console.log(`   - ${table.name}`);
          });
        }
      }
      
      // 测试插入和查询
      db.run("CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)", (err) => {
        if (err) {
          console.error('❌ 创建测试表失败:', err.message);
        } else {
          console.log('✅ 测试表已创建/存在');
          
          // 插入测试数据
          db.run("INSERT INTO test_table (name) VALUES ('test_user')", (err) => {
            if (err) {
              console.error('❌ 插入测试数据失败:', err.message);
            } else {
              console.log('✅ 测试数据插入成功');
              
              // 查询测试数据
              db.all("SELECT * FROM test_table", (err, rows) => {
                if (err) {
                  console.error('❌ 查询测试数据失败:', err.message);
                } else {
                  console.log('📋 测试数据结果:', rows);
                }
                
                // 清理测试表
                db.run("DROP TABLE test_table", (err) => {
                  if (err) {
                    console.error('❌ 清理测试表失败:', err.message);
                  } else {
                    console.log('✅ 清理测试表成功');
                  }
                  
                  // 关闭数据库连接
                  db.close((err) => {
                    if (err) {
                      console.error('❌ 关闭数据库连接失败:', err.message);
                    } else {
                      console.log('✅ 数据库连接已关闭');
                    }
                  });
                });
              });
            }
          });
        }
      });
    });
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 执行测试
testSQLiteConnection();