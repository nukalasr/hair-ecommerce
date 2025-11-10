const User = require('../models/User');
const { ErrorResponse } = require('../middleware/errorHandler');

/**
 * SECURE VERSION with httpOnly cookies and NO token in response body
 */

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('Email already registered', 400));
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'buyer'
    });

    // Generate token and send response with httpOnly cookie
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
        lockedUntil: user.lockUntil
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return next(new ErrorResponse('Account has been deactivated', 401));
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();

      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      await user.resetLoginAttempts();
    }

    // Generate token and send response with httpOnly cookie
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user details
 * @route   PUT /api/auth/updatedetails
 * @access  Private
 */
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse('Please provide current and new password', 400));
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Current password is incorrect', 401));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    // Clear httpOnly cookie properly
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      expires: new Date(0),  // Expire immediately
      path: '/'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * SECURE Helper function - Creates httpOnly cookie, NO token in response
 *
 * Security improvements:
 * 1. Token NOT sent in response body (only in httpOnly cookie)
 * 2. SameSite attribute added (CSRF protection)
 * 3. Secure flag enforced in production
 * 4. Path explicitly set
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Generate token
  const token = user.generateAuthToken();

  // Cookie options - SECURE configuration
  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,  // Prevents JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',  // CSRF protection
    path: '/'  // Available for all routes
  };

  // Send cookie and response WITHOUT token in body
  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      // NO TOKEN IN RESPONSE BODY - use httpOnly cookie only
      user: user.toJSON()
    });
};
