const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const auth = require("./middleware/is-auth");
const fs = require("fs");

const app = express();

const fileStorage = multer.diskStorage({
  // eslint-disable-next-line no-unused-vars
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  // eslint-disable-next-line no-unused-vars
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()}-${file.originalname}`);
  }
});

// eslint-disable-next-line no-unused-vars
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
    cb(null, true);
  }
  else {
    cb(null, false);
  }
};

app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter }).single("image"));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);

// eslint-disable-next-line no-unused-vars
app.put("/put-image", (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("User is not authenticated");
    error.code = 401;
    throw error;
  }

  if (!req.file) {
    return res.status(200).json({ message: "Image is not provided" });
  }
  if (req.body.oldPath) {
    clearImage(req.file.oldPath);
  }
  return res.status(201).json({
    message: " A file stored",
    filePath: req.file.path
  });
});

app.use("/graphql", graphqlHTTP({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: true,
  formatError(err) {
    if (!(err.originalError)) {
      return err;
    }
    const data = err.originalError.data;
    const message = err.message || "An error occurred";
    const code = err.originalError.code || 500;
    return { message, status: code, data };
  }
}));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const data = err.data;
  const status = err.statusCode || 500;
  const message = err.message;
  return res.status(status).json({ message, data });
});

mongoose.connect(process.env.MONGOOSE_CONNECTION_STRING)
  .then(() => {
    app.listen(8080);
  })
  .catch((err) => {
    console.log(err);
  });

const clearImage = filePath => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, err => console.log(err));
};
