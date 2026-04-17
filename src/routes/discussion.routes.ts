import { Router } from 'express';
import { DiscussionController } from '../controllers/discussion.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();
const discussionController = new DiscussionController();

// Some endpoints could be public. For full spec parity, maybe viewing posts is public?
// Spec says: Discussion (/discussion) — Publicly accessible
// -> ComposeBox (auth required)
router.get('/', discussionController.getPosts);
router.get('/:id', discussionController.getPostById);
router.get('/:id/comments', discussionController.getComments);

router.use(authenticate);

router.post('/', discussionController.createPost);
router.post('/:id/like', discussionController.toggleLikePost);
router.post('/:id/bookmark', discussionController.toggleBookmarkPost);
router.post('/:id/comments', discussionController.createComment);

export default router;
