import { ConnectionRequest } from '../models/connectionRequest.model.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/api-response.js';

import { asyncHandler } from '../utils/async-handler.js';

export const getSuggestedRequest = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId)
    return new ApiResponse(
      400,
      null,
      'User ID is required to fetch suggested connections.'
    ).send(res);

  // 1️⃣ Find all connection requests involving the logged-in user
  const existingRequests = await ConnectionRequest.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  }).select('fromUserId toUserId');

  const excludedIds = new Set([userId.toString()]);

  existingRequests.forEach((req) => {
    excludedIds.add(req.fromUserId.toString());
    excludedIds.add(req.toUserId.toString());
  });

  // 2️⃣ Fetch users not in excludedIds
  const suggestedUsers = await User.find({
    _id: { $nin: [...excludedIds] },
  }).select('firstName lastName emailId photoUrl skills bio');

  return new ApiResponse(
    200,
    { suggestedUsers },
    'Suggested connections fetched successfully.'
  ).send(res);
});
