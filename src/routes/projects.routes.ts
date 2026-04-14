import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const projectsController = new ProjectsController();

// All routes require authentication
router.use(authenticate);

// Invitations (must come before /:projectId)
router.get('/invitations', projectsController.getMyInvitations);

// Project CRUD
router.get('/', projectsController.getProjects);
router.post('/', projectsController.createProject);
router.get('/:projectId', projectsController.getProjectById);
router.patch('/:projectId', projectsController.updateProject);
router.delete('/:projectId', projectsController.deleteProject);

// Collaboration requests
router.post('/:projectId/apply', projectsController.applyToProject);
router.post(
  '/:projectId/collaborations/:collaborationId/respond',
  projectsController.respondToCollaboration
);

// Invitations
router.post('/:projectId/invite', projectsController.inviteUser);
router.post(
  '/:projectId/invitations/:invitationId/respond',
  projectsController.respondToInvitation
);

export default router;
