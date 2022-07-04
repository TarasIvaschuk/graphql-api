const User = require("../models/user");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");

module.exports = {
  // eslint-disable-next-line no-unused-vars
  async createUser({ userInput }, req) {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({
        message: "Email is not valid"
      });
    }
    if (validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })) {
      errors.push({
        message: "Password is too short"
      });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      throw  new Error("User exists already!");
    }
    const hashedPsw = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPsw
    });
    const createdUser = await user.save();
    return {
      ...createdUser._doc, _id: createdUser._id.toString()
    };
  },
  hello() {
    return {
      age: 37,
      hobby: ["music", "reading books", "learning German"]
    };
  },
  async login({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User is not found");
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign({
      userId: user._id.toString(),
      email: user.email
    }, process.env.TOKEN, {
      expiresIn: "1h"
    });

    return { token, userId: user._id.toString() };
  }
};
