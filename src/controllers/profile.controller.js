import { User } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  console.log('userId', userId);

  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return new ApiResponse(
    200,
    { user },
    'User profile fetched successfully'
  ).send(res);
});

export const editProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  //   console.log("userId", userId);

  if (!req.body || typeof req.body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }
  const allowedUpdated = [
    'firstName',
    'lastName',
    'age',
    'gender',
    'about',
    'skills',
  ];

  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedUpdated.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields to update');
  }

  if (
    updates.firstName &&
    (updates.firstName.length < 3 || updates.firstName.length > 30)
  ) {
    throw new ApiError(400, 'First name must be between 3 and 30 characters');
  }

  if (
    updates.lastName &&
    (updates.lastName.length < 3 || updates.lastName.length > 30)
  ) {
    throw new ApiError(400, 'Last name must be between 3 and 30 characters');
  }

  if (updates.age && updates.age < 18) {
    throw new ApiError(400, 'Age must be at least 18');
  }

  if (updates.gender && !['male', 'female', 'other'].includes(updates.gender)) {
    throw new ApiError(400, "Gender must be 'male', 'female', or 'other'");
  }

  if (updates.about && updates.about.length > 500) {
    throw new ApiError(400, 'About section must be less than 500 characters');
  }

  if (
    updates.skills &&
    (!Array.isArray(updates.skills) ||
      updates.skills.some((skill) => typeof skill !== 'string'))
  ) {
    throw new ApiError(400, 'Skills must be an array of strings');
  }

  if (
    updates.skills &&
    (!Array.isArray(updates.skills) || updates.skills.length > 20)
  ) {
    throw new ApiError(400, 'Skills must be an array with maximum 20 items.');
  }

  // Sanitize skills array - remove empty strings and duplicates
  if (updates.skills) {
    updates.skills = [
      ...new Set(
        updates.skills.filter(
          (skill) => typeof skill === 'string' && skill.trim().length > 0
        )
      ),
    ];
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true, select: '-password' }
  );

  if (!updatedUser) {
    return new ApiError(404, 'User not found');
  }

  return new ApiResponse(
    200,
    { user: updatedUser },
    'Profile updated successfully'
  ).send(res);
});
