import validator from 'validator';

/**
 * Validate signup request body
 * @param {Object} req - Express request object
 */
export const validateSignUpData = (req) => {
  const { firstName, lastName, emailId, password } = req.body;

  if (!firstName?.trim() || !lastName?.trim()) {
    throw new Error('❌ Name is not valid!');
  }

  if (!validator.isEmail(emailId || '')) {
    throw new Error('❌ Email is not valid!');
  }

  if (!validator.isStrongPassword(password || '')) {
    throw new Error(
      '❌ Please enter a strong password (min 8 chars, mix of uppercase, lowercase, number, and symbol).'
    );
  }
};

/**
 * Validate fields allowed for editing profile
 * @param {Object} req - Express request object
 * @returns {boolean} - true if valid, false otherwise
 */
export const validateEditProfileData = (req) => {
  const allowedEditFields = [
    'firstName',
    'lastName',
    'emailId',
    'photoUrl',
    'gender',
    'age',
    'about',
    'skills',
  ];

  return Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field)
  );
};
