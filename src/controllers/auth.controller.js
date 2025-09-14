import { User } from '../models/user.js';
import { ApiResponse } from '../utils.js/api-response.js';
import { asyncHandler } from '../utils.js/async-handler.js';
import { setAuthCookie } from '../utils.js/cookies.js';
import { validateSignUpData } from '../utils.js/validation.js';
import bcrypt from 'bcryptjs';

export const signup = asyncHandler(async (req, res) => {
  // Validation of data
  validateSignUpData(req);

  const { firstName, lastName, emailId, password } = req.body;

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

  return new ApiResponse(201, {
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
  }).send(res);
});
