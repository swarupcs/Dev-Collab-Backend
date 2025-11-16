import { User } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { clearAuthCookie, setAuthCookie } from '../utils/cookies.js';
import { validateSignUpData } from '../utils/validation.js';
import bcrypt from 'bcryptjs';

export const signup = asyncHandler(async (req, res) => {
  // Validation of data
  validateSignUpData(req);

  const { firstName, lastName, emailId, password } = req.body;

  if (await User.findOne({ emailId })) {
    throw new ApiError(409, 'Email already exists');
  }

  // Encrypt the password
  const passwordHash = await bcrypt.hash(password, 10);
  console.log(passwordHash);

  //   Creating a new instance of the User model
  const user = new User({
    firstName,
    lastName,
    emailId,
    password: passwordHash,
  });

  const savedUser = await user.save();
  const token = await savedUser.getJWT();

  console.log('savedUser:', savedUser);
  console.log('token:', token);

  setAuthCookie(res, token);

  return new ApiResponse(
    201,
    {
      user: {
        _id: savedUser._id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        emailId: savedUser.emailId,
        photoUrl: savedUser.photoUrl,
        about: savedUser.about,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
        skills: savedUser.skills,
      },
      accessToken: token,
    },
    'Signup successful'
  ).send(res);
});

export const signin = asyncHandler(async (req, res) => {
  const { emailId, password } = req.body;

  const user = await User.findOne({ emailId: emailId });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordValid = await user.validatePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = await user.getJWT();

  setAuthCookie(res, token);

  return new ApiResponse(
    200,
    {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
        photoUrl: user.photoUrl,
        about: user.about,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        skills: user.skills,
      },
      accessToken: token,
    },
    'Signin successful'
  ).send(res);
});

export const signout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  return new ApiResponse(200, null, 'Signout successful').send(res);
});
