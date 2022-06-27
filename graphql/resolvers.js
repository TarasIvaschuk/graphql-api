const User = require("../models/user");
const bcrypt = require("bcryptjs");

module.exports = {
  createUser: async function ({userInput}, req) {
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
