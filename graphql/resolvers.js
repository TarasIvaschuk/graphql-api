const User = require("../models/user");
const Post = require("../models/post");
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
  },
  async createPost({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error("User is not authenticated");
      error.code = 401;
      throw error;
    }
    const errors = [];

    if (
      validator.isEmpty(postInput.title)
      || !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({
        message: "Title is invalid. Must be minimum 5 char long"
      });
    }

    if (
      validator.isEmpty(postInput.content)
      || !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({
        message: "Content is invalid. Must be minimum 5 char long"
      });
    }

    if (errors.length > 0) {
      const error = new Error("Invalid input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid user");
      error.code = 401;
      throw error;
    }
    const post = await new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user
    });

    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc, _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString()
    };
  },
  async getPosts(args, req) {
    if (!req.isAuth) {
      const error = new Error("User is not authenticated");
      error.code = 401;
      throw error;
    }
    // todo add pagination
    // const currentPage = req.query.page || 1;
    // const perPage = 2;
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find().populate("creator")
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);
    return {
      posts: posts.map((post) => {
        return {
          ...post._doc, _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString()
        };
      }), totalItems
    };
  }
};


