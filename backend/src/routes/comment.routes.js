// 评论路由
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const CommentController = require('../controllers/comment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// 创建评论验证规则
const createCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 2, max: 2000 })
    .withMessage('评论内容长度必须在2-2000个字符之间'),
  
  body('parentId')
    .optional()
    .isInt()
    .withMessage('父评论ID必须是整数'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('图片必须是数组')
];

// 更新评论验证规则
const updateCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 2, max: 2000 })
    .withMessage('评论内容长度必须在2-2000个字符之间'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('图片必须是数组')
];

// 需要认证的路由
router.use(authenticate);

// 创建评论
router.post('/', createCommentValidation, CommentController.createComment);

// 更新评论
router.put('/:commentId', updateCommentValidation, CommentController.updateComment);

// 删除评论
router.delete('/:commentId', CommentController.deleteComment);

// 点赞评论
router.post('/:commentId/like', CommentController.likeComment);

// 取消点赞评论
router.delete('/:commentId/like', CommentController.unlikeComment);

module.exports = router;