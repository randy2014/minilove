// 用户路由
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const UserController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// 需要认证的中间件
router.use(authenticate);

// 获取当前用户信息
router.get('/me', UserController.getCurrentUser);

// 更新用户信息
router.put('/profile', [
  body('bio').optional().isLength({ max: 500 }).withMessage('个人简介不能超过500字符'),
  body('gender').optional().isIn(['male', 'female', 'unknown']).withMessage('性别选项无效'),
  body('age').optional().isInt({ min: 18, max: 100 }).withMessage('年龄必须在18-100之间'),
  body('city').optional().isLength({ max: 100 }).withMessage('城市名称不能超过100字符')
], UserController.updateProfile);

// 获取用户详情
router.get('/:userId', UserController.getUserById);

// 搜索用户
router.get('/search/:keyword', UserController.searchUsers);

// 关注用户
router.post('/:userId/follow', UserController.followUser);

// 取消关注
router.delete('/:userId/follow', UserController.unfollowUser);

// 获取关注列表
router.get('/:userId/following', UserController.getFollowing);

// 获取粉丝列表
router.get('/:userId/followers', UserController.getFollowers);

// 管理员路由
router.use(authorize('admin'));

// 获取所有用户
router.get('/', UserController.getAllUsers);

// 更新用户状态
router.patch('/:userId/status', UserController.updateUserStatus);

module.exports = router;