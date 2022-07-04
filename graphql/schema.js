const { buildSchema } = require("graphql");

module.exports = buildSchema(`

  type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    creator: User!
    createdAt: String!
    updatedAt: String!    
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    password: String
    status: String!
    posts: [Post!]!
  }

  input UserInputData {
    email: String!
    password: String!
    name: String!
  }
  
  input PostInputData  {
   imageUrl: String!
   title: String!
   content: String!
  }
  
  type RootMutation {
   createUser(userInput: UserInputData): User!
   createPost (postInput: PostInputData): Post!
  }
 
  type TestData {
    age: String!
    hobby: [String!]!
  }
  
  type  AuthData {
    token: String!
    userId: String!
  }
  
  type RootQuery {
    login (email: String!,  password: String!): AuthData!
  }
 
  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);