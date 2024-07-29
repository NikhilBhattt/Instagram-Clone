var express = require('express');
var router = express.Router();
var userModel = require('./users')
var postModel = require('./posts');
const passport = require('passport');
const localStrategy = require('passport-local')
const upload = require('./multer');
passport.use(new localStrategy(userModel.authenticate()))

router.get('/', function(req, res) {
  res.render('index', {footer: false, title : 'Instagram - Register'});
});

router.get('/login', function(req, res) {
  res.render('login', {footer: false, title : 'Instagram - Login'});
});

router.get('/feed', isLoggedIn, async function(req, res) {
  const timeSince = require('../public/javascripts/timeSince')
  
  const user = await userModel
    .findOne({username : req.session.passport.user})
    .populate('following')

  const allPosts = await postModel
    .find()
    .populate('user')

  res.render('feed', {user, allPosts, timeSince, footer: true});
});

router.get('/profile', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  }).populate('posts')

  res.render('profile', { user , footer: true, title : `${user.name} (@${user.username}) • Instagram`});
});

router.get('/search', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username : req.session.passport.user})
  res.render('search', {user, footer: true});
});

router.get('/edit', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username : req.session.passport.user})
  res.render('edit', {user, footer: true});
});

router.get('/upload', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username : req.session.passport.user})
  res.render('upload', {user, footer: true});
});

router.post('/register', function(req, res) {
  const { username, email, name } = req.body
  const userData = new userModel({username, email, name})

  userModel.register(userData, req.body.password)
    .then(function(){
      passport.authenticate('local')(req, res, function(){
        res.redirect('/profile')
      })
    })
})

router.post('/login', passport.authenticate('local', {
  successRedirect : '/feed',
  failureRedirect: '/login'
}), function(req, res) {})

router.get('/logout', function(req, res, next) {
  req.logout(function(err){
    if (err) return next(err)
    res.redirect('/login')
  })
})

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next()
    res.redirect('/login')
}

router.post('/edit', isLoggedIn, upload.single('image'), async function(req, res) {
  const user = await userModel.findOneAndUpdate(
    { username : req.session.passport.user },
    { name : req.body.name, bio : req.body.bio }, 
    { new : true }
  )
  if (req.file){
    user.profileImg = req.file.filename
  }
  await user.save()
  res.redirect('/profile')
})

router.post('/upload', isLoggedIn, upload.single('postImage'), async function(req, res) {
  const user = await userModel.findOne({username : req.session.passport.user})
  const post = await postModel.create({
    caption : req.body.caption,
    postImage : req.file.filename,
    user : user._id
  })
  user.posts.push(post._id)
  await user.save()

  res.redirect('/feed')
})

// axios 
router.get('/username/:usr', isLoggedIn, async function(req, res) {
  const regex = new RegExp(`^${req.params.usr}`, 'i')
  const users = await userModel.find({username : regex})
  return res.json(users)
})

router.get('/like/post/:post_id', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username : req.session.passport.user})
  const post = await postModel.findOne({_id : req.params.post_id})

  if (post.likes.includes(user._id)) {
    post.likes.splice(user._id, 1)
  } else {
    post.likes.push(user._id)
  }
  await post.save()
  res.redirect('/feed')
})

router.get('/save/post/:post_id', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username : req.session.passport.user})
  const post_id = req.params.post_id

  if (user.saved.includes(post_id)) {
    user.saved.splice(post_id, 1)
  } else {
    user.saved.push(post_id)
  }
  await user.save()
  res.redirect(req.get('referer'))
})

router.get('/delete/post/:post_id', isLoggedIn, async function(req, res) {
  const postId = req.params.post_id;
  await postModel.findOneAndDelete({_id : postId})
  const user = await userModel.findOne({username: req.session.passport.user})

  user.posts.splice(postId, 1);
  await user.save();
  
  res.redirect('/feed')
})

router.get('/current-user', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username : req.session.passport.user})
  res.json(user)
})

router.get('/follow/:user_id', isLoggedIn, async function(req, res){
  const currUser = await userModel.findOne({username : req.session.passport.user})

  const toFollowUser = await userModel.findOne({_id : req.params.user_id})
  if (!toFollowUser) res.send('Not valid user')

  if (toFollowUser.followers.includes(currUser._id)){
    currUser.following.splice(toFollowUser._id, 1)
    toFollowUser.followers.splice(currUser._id, 1)
  }
  else {
    currUser.following.push(toFollowUser._id)
    toFollowUser.followers.push(currUser._id)
  }
  await currUser.save()
  await toFollowUser.save()

  res.redirect(req.get('referer'))
})

module.exports = router; 