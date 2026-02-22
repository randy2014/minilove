-- MiniLove 数据库架构
-- 创建数据库
CREATE DATABASE minilove_dev;
CREATE DATABASE minilove_test;

-- 创建用户
CREATE USER minilove_user WITH PASSWORD 'minilove_password';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE minilove_dev TO minilove_user;
GRANT ALL PRIVILEGES ON DATABASE minilove_test TO minilove_user;

-- 连接到开发数据库
\c minilove_dev

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- 个人信息
    avatar_url VARCHAR(500),
    bio TEXT,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    age INT CHECK (age >= 0 AND age <= 120),
    city VARCHAR(100),
    
    -- 会员信息
    membership_level VARCHAR(20) DEFAULT 'free' CHECK (membership_level IN ('free', 'basic', 'premium')),
    membership_expires_at TIMESTAMP,
    
    -- 统计信息
    posts_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    likes_given_count INT DEFAULT 0,
    likes_received_count INT DEFAULT 0,
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_membership (membership_level),
    INDEX idx_users_city (city)
);

-- 帖子表
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 内容
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    images JSONB DEFAULT '[]',
    
    -- 分类标签
    category VARCHAR(50) NOT NULL,
    tags VARCHAR(50)[] DEFAULT '{}',
    emotion_tags VARCHAR(50)[] DEFAULT '{}',
    
    -- 统计
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    
    -- 可见性
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'hidden')),
    
    -- 时间
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_posts_user (user_id),
    INDEX idx_posts_category (category),
    INDEX idx_posts_status (status),
    INDEX idx_posts_created (created_at DESC),
    INDEX idx_posts_emotion (emotion_tags)
);

-- 评论表
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INT REFERENCES comments(id) ON DELETE CASCADE,
    
    -- 内容
    content TEXT NOT NULL,
    
    -- 统计
    likes_count INT DEFAULT 0,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
    
    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_comments_post (post_id),
    INDEX idx_comments_user (user_id),
    INDEX idx_comments_parent (parent_id),
    INDEX idx_comments_created (created_at DESC)
);

-- 话题表
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    cover_image VARCHAR(500),
    
    -- 统计
    posts_count INT DEFAULT 0,
    participants_count INT DEFAULT 0,
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_topics_name (name),
    INDEX idx_topics_featured (is_featured)
);

-- 聊天室表
CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'public' CHECK (type IN ('public', 'private', 'group')),
    
    -- 容量
    max_participants INT DEFAULT 100,
    current_participants INT DEFAULT 0,
    
    -- 时间安排
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    
    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_chat_rooms_active (is_active),
    INDEX idx_chat_rooms_time (start_time)
);

-- 会员套餐表
CREATE TABLE membership_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INT NOT NULL,
    
    -- 功能
    features JSONB NOT NULL DEFAULT '{}',
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    
    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_plans_active (is_active),
    INDEX idx_plans_price (price)
);

-- 订单表
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    plan_id INT NOT NULL REFERENCES membership_plans(id),
    
    -- 金额
    amount DECIMAL(10, 2) NOT NULL,
    
    -- 支付信息
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    transaction_id VARCHAR(200),
    
    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- 索引
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (payment_status),
    INDEX idx_orders_created (created_at DESC)
);

-- 点赞表
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    comment_id INT REFERENCES comments(id) ON DELETE CASCADE,
    
    -- 类型检查
    CONSTRAINT likes_target_check 
        CHECK ((post_id IS NOT NULL)::integer + (comment_id IS NOT NULL)::integer = 1),
    
    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 唯一约束（用户不能重复点赞同一目标）
    UNIQUE(user_id, post_id, comment_id),
    
    -- 索引
    INDEX idx_likes_user (user_id),
    INDEX idx_likes_post (post_id),
    INDEX idx_likes_comment (comment_id)
);

-- 关注表
CREATE TABLE follows (
    id SERIAL PRIMARY KEY,
    follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 不能关注自己
    CHECK (follower_id != following_id),
    
    -- 唯一约束
    UNIQUE(follower_id, following_id),
    
    -- 索引
    INDEX idx_follows_follower (follower_id),
    INDEX idx_follows_following (following_id)
);

-- 创建触发器函数：自动更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为每个表创建更新触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建计数器更新函数
CREATE OR REPLACE FUNCTION increment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 更新帖子统计
        IF TG_TABLE_NAME = 'posts' THEN
            UPDATE users SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
        ELSIF TG_TABLE_NAME = 'comments' THEN
            UPDATE users SET comments_count = comments_count + 1 WHERE id = NEW.user_id;
            UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_TABLE_NAME = 'likes' THEN
            IF NEW.post_id IS NOT NULL THEN
                UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
                UPDATE users SET likes_given_count = likes_given_count + 1 WHERE id = NEW.user_id;
                UPDATE users u SET likes_received_count = likes_received_count + 1 
                FROM posts p WHERE p.id = NEW.post_id AND u.id = p.user_id;
            ELSIF NEW.comment_id IS NOT NULL THEN
                UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
                UPDATE users SET likes_given_count = likes_given_count + 1 WHERE id = NEW.user_id;
                UPDATE users u SET likes_received_count = likes_received_count + 1 
                FROM comments c WHERE c.id = NEW.comment_id AND u.id = c.user_id;
            END IF;
        ELSIF TG_TABLE_NAME = 'follows' THEN
            -- 后续可以添加粉丝数统计
            NULL;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- 删除时的反向操作
        IF TG_TABLE_NAME = 'posts' THEN
            UPDATE users SET posts_count = posts_count - 1 WHERE id = OLD.user_id;
        ELSIF TG_TABLE_NAME = 'comments' THEN
            UPDATE users SET comments_count = comments_count - 1 WHERE id = OLD.user_id;
            UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        ELSIF TG_TABLE_NAME = 'likes' THEN
            IF OLD.post_id IS NOT NULL THEN
                UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
                UPDATE users SET likes_given_count = likes_given_count - 1 WHERE id = OLD.user_id;
                UPDATE users u SET likes_received_count = likes_received_count - 1 
                FROM posts p WHERE p.id = OLD.post_id AND u.id = p.user_id;
            ELSIF OLD.comment_id IS NOT NULL THEN
                UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
                UPDATE users SET likes_given_count = likes_given_count - 1 WHERE id = OLD.user_id;
                UPDATE users u SET likes_received_count = likes_received_count - 1 
                FROM comments c WHERE c.id = OLD.comment_id AND u.id = c.user_id;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 为相关表创建统计更新触发器
CREATE TRIGGER update_post_stats AFTER INSERT OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION increment_count();

CREATE TRIGGER update_comment_stats AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION increment_count();

CREATE TRIGGER update_like_stats AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION increment_count();

-- 创建视图：用户活跃度视图
CREATE VIEW user_activity AS
SELECT 
    u.id,
    u.username,
    u.membership_level,
    u.posts_count,
    u.comments_count,
    u.likes_given_count,
    u.likes_received_count,
    u.created_at,
    -- 活跃度分数
    (posts_count * 2 + comments_count + likes_given_count * 0.5 + likes_received_count * 0.2) as activity_score,
    -- 最近活跃时间
    GREATEST(
        COALESCE((SELECT MAX(created_at) FROM posts WHERE user_id = u.id), '1970-01-01'),
        COALESCE((SELECT MAX(created_at) FROM comments WHERE user_id = u.id), '1970-01-01'),
        COALESCE((SELECT MAX(created_at) FROM likes WHERE user_id = u.id), '1970-01-01')
    ) as last_active_at
FROM users u;

-- 插入初始数据
INSERT INTO membership_plans (name, description, price, duration_days, features) VALUES
('免费会员', '基础功能，无限制内容浏览', 0.00, 9999, '{"max_posts_per_day": 3, "can_comment": true, "can_like": true, "basic_content_access": true}'),
('基础会员', '增强社交功能，更多发布权限', 29.90, 30, '{"max_posts_per_day": 10, "can_comment": true, "can_like": true, "content_access": "all", "priority_support": false, "custom_avatar": true}'),
('高级会员', '全方位服务，个性化支持', 89.90, 30, '{"max_posts_per_day": 30, "can_comment": true, "can_like": true, "content_access": "all", "priority_support": true, "custom_avatar": true, "one_on_one_support": true, "advanced_analytics": true}');

INSERT INTO topics (name, description, is_featured, posts_count, participants_count) VALUES
('情感倾诉', '分享你的心情故事，寻找共鸣', true, 25, 120),
('目标规划', '如何找到人生方向，设定可实现的目标', true, 18, 85),
('晚间闲聊', '夜深人静时的随性交流', true, 42, 210),
('单身生活', '独处时光的分享与建议', true, 15, 75),
('工作压力', '职场中的困惑与解压', true, 28, 140);

-- 创建只读用户
CREATE USER minilove_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE minilove_dev TO minilove_readonly;
GRANT USAGE ON SCHEMA public TO minilove_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO minilove_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO minilove_readonly;