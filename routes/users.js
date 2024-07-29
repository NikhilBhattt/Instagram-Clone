const mongoose = require('mongoose')
const plm = require('passport-local-mongoose')

mongoose.connect('mongodb://localhost:27017/instaclone')

const userSchema = new mongoose.Schema({
  username : String,
  email : String,
  name : String,
  password : String,
  profileImg : String,
  bio : String,
  posts : [{ type : mongoose.Schema.Types.ObjectId, ref : 'post' }],
  saved : [{ type : mongoose.Schema.Types.ObjectId, ref : 'post' }],
  followers : [{ type : mongoose.Schema.Types.ObjectId, ref : 'user' }],
  following : [{ type : mongoose.Schema.Types.ObjectId, ref : 'user' }],
})

userSchema.plugin(plm)

module.exports = mongoose.model('user', userSchema) 