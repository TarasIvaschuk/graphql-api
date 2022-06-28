const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");
const multer = require("multer");
const {graphqlHTTP} = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.json());
app.use(multer({storage: fileStorage, fileFilter}).single("image"));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
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
    return {message, status: code, data};
  }
}));

app.use((err, req, res, next) => {
  const data = err.data;
  const status = err.statusCode || 500;
  const message = err.message;
  return res.status(status).json({message, data});
});

mongoose.connect(process.env.MONGOOSE_CONNECTION_STRING)
  .then(() => {
    app.listen(8080);
  })
  .catch((err) => {
    console.log(err);
  });