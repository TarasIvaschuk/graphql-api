const { validationResult } = require("express-validator");
const Post = require("../models/post");
const User = require("../models/user");
const fs = require("fs");
const path = require("path");

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then(count => {
      totalItems = count;
      return Post.find()
        .populate("creator")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then(posts => res.status(200).json({
      message: "Fetched posts successfully",
      posts,
      totalItems
    }))
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
        return next(err);
      }
    });
};

exports.createPost = (req, res, next) => {
  const { title, content } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed, entered data is incorrect");
    err.statusCode = 422;
    return next(err);
    // throw error;
  }
  if (!req.file) {
    const err = new Error("No image provided");
    err.statusCode = 422;
    throw err;
  }

  const imageUrl = req.file.path;
  const post = new Post({
    title,
    content,
    imageUrl,
    creator: req.userId
  });
  let creator;
  let user;

  post.save()
    .then(() => {
      user = User.findById(req.userId);
      return user;
    })
    .then(user => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then((data) => {
      console.log(data);
      io.getIO().emit("posts", {
        action: "create",
        post: { ...post._doc, creator: { _id: req.userId }, name: user.name }
      });
      return res.status(201).json({
        message: "Post created successfully",
        post,
        creator: {
          _id: creator._id, name: creator.name
        }
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
        return next(err);
      }
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const err = new Error("Could not find the post");
        err.statusCode = 404;
        throw err;
      }
      return res.status(200).json({ message: "Post fetched ", post });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
        return next(err);
      }
    });
};

exports.updatePost = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed, entered data is incorrect");
    err.statusCode = 422;
    return next(err);
    // throw error;
  }
  const postId = req.params.postId;
  const content = req.body.content;
  const title = req.body.title;
  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const err = new Error("No file picked!");
    err.statusCode = 422;
    throw err;
  }

  Post.findById(postId)
    .populate("creator")
    .then(post => {
      if (!post) {
        const err = new Error("Could not find the post");
        err.statusCode = 404;
        throw err;
      }

      if (post.creator._id.toString() !== req.userId) {
        console.log("throwing an error message ");
        const error = new Error("No authorized to update post");
        error.statusCode = 403;
        throw error;
      }

      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;
      return post.save();
    })
    .then(result => {
      io.getIO().emit("posts", { action: "update", post: result });
      res.status(200).json({
        message: "Post updated!",
        post: result
      });
    }
    )
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      return next(err);
    });
};

const clearImage = filePath => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, err => console.log(err));
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const err = new Error("Could not find the post");
        err.statusCode = 404;
        throw err;
      }

      if (post.creator.toString() !== req.userId) {
        console.log("throwing an error message ");
        const error = new Error("No authorized to delete the post");
        error.statusCode = 403;
        throw error;
      }

      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(postId);
    })
    .then(() => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then((result) => {
      io.getIO().emit("posts", { action: "delete", post: postId });
      return res.status(200).json({
        message: "Post deleted",
        post: result
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      return next(err);
    });
};
