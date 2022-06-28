const User = require("../models/user");
const bcrypt = require("bcryptjs");
const validator = require('validator');

module.exports = {
  createUser: async function ({userInput}, req) {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({
        message: "Email is not valid"
      })
    }
    if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, {min: 5})) {
      errors.push({
        message: "Password is too short"
      })
    }

    if (errors.length > 0) {
     const error = new Error ('Invalid input');
     error.data = errors;
     error.code = 422;
     throw error;
    }

    const existingUser = await User.findOne({email: userInput.email});
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
  hello () {
    return {
      age: 37,
      hobby: ['music','reading books','learning German']
    }
  }
};
