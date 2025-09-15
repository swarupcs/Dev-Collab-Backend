import { ConnectionRequest } from '../models/connectionRequest.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils.js/api-error.js';
import { ApiResponse } from '../utils.js/api-response.js';
import { asyncHandler } from '../utils.js/async-handler.js';

export const sendRequest = asyncHandler(async (req, res) => {
  const fromUserId = req.user._id;
  const toUserId = req.params.toUserId;
  const status = req.params.status;

  if (!fromUserId || !toUserId) {
    throw new ApiError(400, 'Invalid request. Required fields are missing.');
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

  if (existingConnectionRequest) {
    throw new ApiError(
      400,
      'You have already sent a connection request to this user.'
    );
  }

  const connectionRequest = new ConnectionRequest({
    fromUserId,
    toUserId,
    status,
  });

  const data = await connectionRequest.save().then((reqDoc) =>
    reqDoc.populate([
      { path: 'fromUserId', select: 'firstName lastName emailId photoUrl' },
      { path: 'toUserId', select: 'firstName lastName emailId photoUrl' },
    ])
  );

  return new ApiResponse(
    201,
    data,
    'Connection request sent successfully.'
  ).send(res);
});
