// 认证路由
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// 注册验证规则
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('phone')
    .optional()
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('请输入有效的手机号码'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
    
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('密码长度必须在6-100个字符之间')
];

// 登录验证规则
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('用户名不能为空'),
    
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
];

// 公开路由
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// 需要认证的路由
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/refresh', authenticate, AuthController.refreshToken);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;