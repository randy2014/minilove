// 帖子路由
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const PostController = require('../controllers/post.controller');
const { authenticate, optionalAuth, checkMembership } = require('../middlewares/auth.middleware');

// 创建帖子验证规则
const createPostValidation = [
  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('内容长度必须在10-5000个字符之间'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('标题不能超过200个字符'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('分类不能超过50个字符'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('图片必须是数组'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'friends_only'])
    .withMessage('可见性选项无效')
];

// 更新帖子验证规则
const updatePostValidation = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('内容长度必须在10-5000个字符之间'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('标题不能超过200个字符'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('分类不能超过50个字符'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('图片必须是数组'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'friends_only'])
    .withMessage('可见性选项无效'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('状态选项无效')
];

// 公开路由（可选认证）
router.get('/', optionalAuth, PostController.getAllPosts);
router.get('/featured', optionalAuth, PostController.getFeaturedPosts);
router.get('/trending', optionalAuth, PostController.getTrendingPosts);
router.get('/:postId', optionalAuth, PostController.getPostById);
router.get('/:postId/comments', optionalAuth, PostController.getPostComments);
router.get('/user/:userId', optionalAuth, PostController.getUserPosts);

// 需要认证的路由
router.use(authenticate);

// 创建帖子
router.post('/', createPostValidation, PostController.createPost);

// 更新帖子
router.put('/:postId', updatePostValidation, PostController.updatePost);

// 删除帖子
router.delete('/:postId', PostController.deletePost);

// 点赞帖子
router.post('/:postId/like', PostController.likePost);

// 取消点赞
router.delete('/:postId/like', PostController.unlikePost);

// 收藏帖子
router.post('/:postId/bookmark', PostController.bookmarkPost);

// 取消收藏
router.delete('/:postId/bookmark', PostController.unbookmarkPost);

// 会员专属路由
router.use(checkMembership);

// 会员专属内容
router.get('/premium/feed', PostController.getPremiumFeed);
router.get('/premium/topics', PostController.getPremiumTopics);

module.exports = router;