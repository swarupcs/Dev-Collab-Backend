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

  // Input validation
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(400, 'Invalid request ID format.');
  }

  const allowedStatus = ['accepted', 'rejected'];

  if (!allowedStatus.includes(status)) {
    throw new ApiError(400, `Invalid status ${status}`);
  }

  const connectionRequest = await ConnectionRequest.findOne({
    _id: requestId,
    toUserId: loggedInUser._id,
    status: 'interested',
  }).populate([
    {
      path: 'fromUserId',
      select: 'firstName lastName emailId photoUrl skills bio',
    },
    {
      path: 'toUserId',
      select: 'firstName lastName emailId photoUrl skills bio',
    },
  ]);

  if (!connectionRequest) {
    throw new ApiError(404, 'No pending connection request found.');
  }
  connectionRequest.status = status;
  connectionRequest.reviewedAt = new Date();

  const data = await connectionRequest.save();

  // Optional: Create notification or send email for acceptance
  if (status === 'accepted') {
    // Add notification logic here
    // await createNotification(connectionRequest.fromUserId, 'CONNECTION_ACCEPTED', ...);
  }

  const message =
    status === 'accepted'
      ? `Connection request accepted! You are now connected with ${connectionRequest.fromUserId.firstName}.`
      : 'Connection request rejected.';

  return new ApiResponse(200, data, message).send(res);
});

// Get sent requests
export const getSentRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [requests, totalCount] = await Promise.all([
    ConnectionRequest.find({
      fromUserId: userId,
      status: { $in: ['interested', 'accepted', 'rejected'] },
    })
      .populate('toUserId', 'firstName lastName emailId photoUrl skills bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    ConnectionRequest.countDocuments({
      fromUserId: userId,
      status: { $in: ['interested', 'accepted', 'rejected'] },
    }),
  ]);

  return new ApiResponse(
    200,
    {
      requests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRequests: totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    },
    'Sent requests fetched successfully.'
  ).send(res);
});

// Get pending requests
export const getPendingRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [requests, totalCount] = await Promise.all([
    ConnectionRequest.find({
      toUserId: userId,
      status: 'interested',
    })
      .populate('fromUserId', 'firstName lastName emailId photoUrl skills bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    ConnectionRequest.countDocuments({
      toUserId: userId,
      status: 'interested',
    }),
  ]);

  return new ApiResponse(
    200,
    {
      requests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRequests: totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    },
    'Pending requests fetched successfully.'
  ).send(res);
});

// Get connections (accepted requests)
export const getConnections = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [connections, totalCount] = await Promise.all([
    ConnectionRequest.find({
      $or: [
        { fromUserId: userId, status: 'accepted' },
        { toUserId: userId, status: 'accepted' },
      ],
    })
      .populate('fromUserId', 'firstName lastName emailId photoUrl skills bio')
      .populate('toUserId', 'firstName lastName emailId photoUrl skills bio')
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(limit),

    ConnectionRequest.countDocuments({
      $or: [
        { fromUserId: userId, status: 'accepted' },
        { toUserId: userId, status: 'accepted' },
      ],
    }),
  ]);

  // Transform data to show the connected user (not the current user)
  const transformedConnections = connections.map((conn) => {
    const connectedUser =
      conn.fromUserId._id.toString() === userId.toString()
        ? conn.toUserId
        : conn.fromUserId;

    return {
      _id: conn._id,
      connectedUser,
      connectedAt: conn.reviewedAt,
      createdAt: conn.createdAt,
    };
  });

  return new ApiResponse(
    200,
    {
      connections: transformedConnections,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalConnections: totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    },
    'Connections fetched successfully.'
  ).send(res);
});

export const getAllConnectionActivity = asyncHandler(async (req, res) => {
  // To be implemented: Fetch activities from all connections
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const status = req?.query?.status; // Optional filter: 'pending', 'accepted', 'rejected', 'ignored'
  const type = req?.query?.type; // Optional filter: 'sent', 'received'

  // Build query based on filters
  const query = {
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  };

  if (status) {
    query.status = status;
  }

  if (type === 'sent') {
    query = { fromUserId: userId, ...(status && { status }) };
  } else if (type === 'received') {
    query = { toUserId: userId, ...(status && { status }) };
  }

  const [activities, totalCount] = await Promise.all([
    ConnectionRequest.find(query)
      .populate('fromUserId', 'firstName lastName emailId photoUrl skills bio')
      .populate('toUserId', 'firstName lastName emailId photoUrl skills bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    ConnectionRequest.countDocuments(query),
  ]);

  // Transform data to add metadata
  const transformedActivities = activities.map((activity) => {
    const isSentByMe = activity.fromUserId._id.toString() === userId.toString();
    const otherUser = isSentByMe ? activity.toUserId : activity.fromUserId;

    return {
      _id: activity._id,
      otherUser,
      status: activity.status,
      type: isSentByMe ? 'sent' : 'received',
      createdAt: activity.createdAt,
      reviewedAt: activity.reviewedAt,
      canCancel: isSentByMe && activity.status === 'interested',
      canRespond: !isSentByMe && activity.status === 'interested',
    };
  });

  // Get summary counts
  const [sentCount, receivedCount, connectedCount, pendingCount] =
    await Promise.all([
      ConnectionRequest.countDocuments({ fromUserId: userId }),
      ConnectionRequest.countDocuments({ toUserId: userId }),
      ConnectionRequest.countDocuments({
        $or: [
          { fromUserId: userId, status: 'accepted' },
          { toUserId: userId, status: 'accepted' },
        ],
      }),
      ConnectionRequest.countDocuments({
        toUserId: userId,
        status: 'interested',
      }),
    ]);

  return new ApiResponse(
    200,
    {
      activities: transformedActivities,
      summary: {
        totalSent: sentCount,
        totalReceived: receivedCount,
        totalConnections: connectedCount,
        pendingRequests: pendingCount,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalActivities: totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    },
    'Connection activities fetched successfully.'
  ).send(res);
});


// CANCEL SENT REQUEST

// GET CONNECTION SUGGESTIONS - Helpful for discovery

// GET MUTUAL CONNECTIONS - See common connections

// GET CONNECTION STATS - Analytics for user

// BLOCK/UNBLOCK USER - Important for user safety