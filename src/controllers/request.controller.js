import { ConnectionRequest } from '../models/connectionRequest.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils.js/api-error.js';
import { ApiResponse } from '../utils.js/api-response.js';
import { asyncHandler } from '../utils.js/async-handler.js';

/**
 * 1. Send Connection Request
 * 2. Review Connection Request (Accept/Reject/Ignore)
 * 3. List Connection Requests (Sent/Received)
 * 4. List Connections
 *
 *
 */

export const sendRequest = asyncHandler(async (req, res) => {
  const fromUserId = req.user._id;
  const toUserId = req.params.toUserId;
  const status = req.params.status;

  if (!fromUserId || !toUserId) {
    throw new ApiError(400, 'Invalid request. Required fields are missing.');
  }

  if (!mongoose.Types.ObjectId.isValid(toUserId)) {
    throw new ApiError(400, 'Invalid user ID format.');
  }

  // Prevent self-requests
  if (fromUserId.toString() === toUserId) {
    throw new ApiError(400, 'Cannot send connection request to yourself.');
  }

  const allowedStatus = ['ignored', 'interested'];

  if (!allowedStatus.includes(status)) {
    throw new ApiError(400, `Invalid status ${status}`);
  }

  const toUser = await User.findById(toUserId);
  if (!toUser) {
    throw new ApiError(
      404,
      'The user you are trying to connect with does not exist.'
    );
  }

  const existingConnectionRequest = await ConnectionRequest.findOne({
    $or: [
      { fromUserId, toUserId },
      { fromUserId: toUserId, toUserId: fromUserId },
    ],
  });

  // Parallel database queries for better performance
  // const [toUser, existingConnectionRequest] = await Promise.all([
  //   User.findById(toUserId).select('_id firstName lastName'),
  //   ConnectionRequest.findOne({
  //     $or: [
  //       { fromUserId, toUserId },
  //       { fromUserId: toUserId, toUserId: fromUserId },
  //     ],
  //   }),
  // ]);

  // if (existingConnectionRequest) {
  //   throw new ApiError(
  //     400,
  //     'You have already sent a connection request to this user.'
  //   );
  // }

  // Enhanced existing request handling
  if (existingConnectionRequest) {
    let message = 'Connection request already exists with this user.';
    if (existingConnectionRequest.status === 'accepted') {
      message = 'You are already connected with this user.';
    } else if (existingConnectionRequest.status === 'interested') {
      message = 'You have already sent a connection request to this user.';
    } else if (existingConnectionRequest.status === 'rejected') {
      message = 'This connection request was previously rejected.';
    }
    throw new ApiError(400, message);
  }

  const connectionRequest = new ConnectionRequest({
    fromUserId,
    toUserId,
    status,
    createdAt: new Date(),
  });

 const data = await connectionRequest.save().then((reqDoc) =>
   reqDoc.populate([
     {
       path: 'fromUserId',
       select: 'firstName lastName emailId photoUrl skills bio',
     },
     {
       path: 'toUserId',
       select: 'firstName lastName emailId photoUrl skills bio',
     },
   ])
 );

  return new ApiResponse(
    201,
    data,
    `Connection request sent successfully to ${toUser.firstName}.`
  ).send(res);
});

export const reviewRequest = asyncHandler(async (req, res) => {
  const loggedInUser = req.user;
  const { status, requestId } = req.params;

  const allowedStatus = ['accepted', 'rejected'];

  if (!allowedStatus.includes(status)) {
    throw new ApiError(400, `Invalid status ${status}`);
  }

  const connectionRequest = await ConnectionRequest.findOne({
    _id: requestId,
    toUserId: loggedInUser._id,
    status: 'interested',
  });

  if (!connectionRequest) {
    throw new ApiError(404, 'No pending connection request found.');
  }
  connectionRequest.status = status;

  const data = await connectionRequest.save();

  return new ApiResponse(
    200,
    data,
    'Connection request reviewed successfully.'
  ).send(res);
});
