import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate as auth } from '@/middleware/auth';
import type { AuthRequest } from '@/middleware/auth';
import { validate, validateParams, validateQuery } from '@/middleware/validation';
import * as RoomsController from '@/controllers/rooms';
import {
  createRoomSchema,
  addRoomMemberSchema,
  removeRoomMemberParamSchema,
  roomIdParamSchema,
  sendRoomMessageSchema,
  getRoomMessagesQuerySchema,
} from '@/validators/rooms';

const router = Router();

const adaptAuth = (handler: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req as AuthRequest, res)).catch(next);
  };
};

const adaptMw = (
  mw: (req: AuthRequest, res: Response, next: NextFunction) => void | Promise<void>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(mw(req as AuthRequest, res, next)).catch(next);
  };
};

const authenticateMw = adaptMw(auth);

// Rooms
router.post('/', authenticateMw, validate(createRoomSchema), adaptAuth(RoomsController.createRoom));
router.post('/:roomId/members', authenticateMw, validateParams(roomIdParamSchema), validate(addRoomMemberSchema), adaptAuth(RoomsController.addMember));
router.delete('/:roomId/members/:userId', authenticateMw, validateParams(removeRoomMemberParamSchema), adaptAuth(RoomsController.removeMember));

// Room messages
router.post('/:roomId/messages', authenticateMw, validateParams(roomIdParamSchema), validate(sendRoomMessageSchema), adaptAuth(RoomsController.sendRoomMessage));
router.get('/:roomId/messages', authenticateMw, validateParams(roomIdParamSchema), validateQuery(getRoomMessagesQuerySchema), adaptAuth(RoomsController.getRoomMessages));

export default router;