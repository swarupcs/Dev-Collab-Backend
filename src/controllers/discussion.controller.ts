import type { Response, NextFunction } from 'express';
import { DiscussionPost } from '../models/DiscussionPost';
import { DiscussionComment } from '../models/DiscussionComment';
import { Activity } from '../models/Activity';
import { successResponse } from '../utils/response';
import type { AuthRequest } from '../middlewares/auth.middleware';
import mongoose from 'mongoose';

export class DiscussionController {
  getPosts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, sort = 'recent', limit = 20, page = 1 } = req.query;
      const query: Record<string, string> = {};
      if (category && category !== 'All') {
        query.category = String(category);
      }

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      let sortObj: Record<string, any> = { createdAt: -1 };
      if (sort === 'popular') {
        sortObj = { 'likes.length': -1, createdAt: -1 };
      }

      const posts = await DiscussionPost.find(query)
        .sort(sortObj)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('author', 'firstName lastName avatarUrl headline');

      // Add a virtual field for whether the current user liked it
      const enhancedPosts = posts.map(post => {
        const obj = post.toJSON() as unknown as Record<string, unknown>;
        obj.isLiked = req.userId ? post.likes.some(id => id.toString() === req.userId) : false;
        obj.isBookmarked = req.userId ? post.bookmarks.some(id => id.toString() === req.userId) : false;
        obj.likesCount = post.likes.length;
        obj.bookmarksCount = post.bookmarks.length;
        return obj;
      });

      successResponse(res, enhancedPosts);
    } catch (error) {
      next(error);
    }
  };

  createPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, content, category } = req.body as Record<string, string>;
      const post = await DiscussionPost.create({
        author: req.userId,
        title,
        content,
        category,
        likes: [],
        bookmarks: [],
        reactions: []
      });

      const populatedPost = await DiscussionPost.findById(post._id).populate('author', 'firstName lastName avatarUrl headline');
      successResponse(res, populatedPost, 'Post created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getPostById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await DiscussionPost.findById(req.params.id)
        .populate('author', 'firstName lastName avatarUrl headline');
      
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found' });
        return;
      }

      const obj = post.toJSON() as unknown as Record<string, unknown>;
      obj.isLiked = req.userId ? post.likes.some(id => id.toString() === req.userId) : false;
      obj.isBookmarked = req.userId ? post.bookmarks.some(id => id.toString() === req.userId) : false;
      obj.likesCount = post.likes.length;
      obj.bookmarksCount = post.bookmarks.length;

      successResponse(res, obj);
    } catch (error) {
      next(error);
    }
  };

  toggleLikePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await DiscussionPost.findById(req.params.id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found' });
        return;
      }

      const userIdObj = new mongoose.Types.ObjectId(req.userId);
      const isLiked = post.likes.some(id => id.toString() === req.userId);

      if (isLiked) {
        post.likes = post.likes.filter(id => id.toString() !== req.userId);
      } else {
        post.likes.push(userIdObj as unknown as mongoose.Types.ObjectId);
      }
      
      await post.save();
      successResponse(res, { isLiked: !isLiked, likesCount: post.likes.length });
    } catch (error) {
      next(error);
    }
  };

  toggleBookmarkPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await DiscussionPost.findById(req.params.id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found' });
        return;
      }

      const userIdObj = new mongoose.Types.ObjectId(req.userId);
      const isBookmarked = post.bookmarks.some(id => id.toString() === req.userId);

      if (isBookmarked) {
        post.bookmarks = post.bookmarks.filter(id => id.toString() !== req.userId);
      } else {
        post.bookmarks.push(userIdObj as unknown as mongoose.Types.ObjectId);
      }
      
      await post.save();
      successResponse(res, { isBookmarked: !isBookmarked, bookmarksCount: post.bookmarks.length });
    } catch (error) {
      next(error);
    }
  };

  getComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comments = await DiscussionComment.find({ post: req.params.id })
        .sort({ createdAt: 1 })
        .populate('author', 'firstName lastName avatarUrl headline');

      const enhancedComments = comments.map(comment => {
        return {
          ...comment.toJSON(),
          isLiked: req.userId ? comment.likes.some(id => id.toString() === req.userId) : false,
          likesCount: comment.likes.length
        };
      });

      successResponse(res, enhancedComments);
    } catch (error) {
      next(error);
    }
  };

  createComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { content, parentComment } = req.body as { content: string; parentComment?: string };
      const postId = req.params.id as string;

      const commentData: Record<string, unknown> = {
        post: postId,
        author: req.userId,
        parentComment: parentComment || null,
        content,
        likes: []
      };

      const comment = await DiscussionComment.create(commentData);

      await DiscussionPost.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

      const populatedComment = await DiscussionComment.findById(comment.id).populate('author', 'firstName lastName avatarUrl headline');
      
      // Notify post author if different user
      const post = await DiscussionPost.findById(postId);
      if (post && post.author.toString() !== req.userId) {
        await Activity.create({
          user: post.author,
          type: 'DISCUSSION_REPLY',
          content: 'Someone replied to your discussion post.',
          relatedUser: req.userId
        });
      }

      successResponse(res, populatedComment, 'Comment created', 201);
    } catch (error) {
      next(error);
    }
  };
}
