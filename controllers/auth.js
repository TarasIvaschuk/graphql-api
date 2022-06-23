const User = require("../models/user");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed!");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  bcrypt.hash(password, 12)
    .then(hashedPsw => {
      const user = new User({
        email,
        password: hashedPsw,
        name,
      });
      return user.save();
    })
    .then(result => {
      return res.status(201).json({
        message: "User is created",
        userId: result._id
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
        return next(err);
      }
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email })
    .then(user => {
      if (!user) {
        const error = new Error("No user is found with this email!");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign({ email: loadedUser.email, userId: loadedUser._id.toString() },
        process.env.TOKEN,
        { expiresIn: "1h" }
      );
      return res.status(200).json({ token, userId: loadedUser._id.toString() });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
        return next(err);
      }
    });
};

exports.status = (req, res, next) => {
  const userId = req.userId;
  User.findOne({ userId })
    .then(user => {
      if (!user) {
        const error = new Error("No user is found with this ID!");
        error.statusCode = 401;
        throw error;
      }
      return user.status;
    })
    .then(userStatus => {
      return res.status(200).json({
        status: userStatus
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
        return next(err);
      }
    });
};

exports.updateStatus = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed, entered data is incorrect");
    err.statusCode = 422;
    throw err;
  }
  const updatedStatus = req.body.userStatus;
  User.findById(req.userId)
    .then(user => {
      if (!user) {
        const error = new Error("No user is found with this ID!");
        error.statusCode = 401;
        throw error;
      }
      user.status = updatedStatus;
      return user.save();
    })
    .then(() => {
      return res.status(200).json({
        status: updatedStatus
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
        return next(err);
      }
    });
};