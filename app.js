const express = require('express')
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const userRoutes = require('./routes/user');
const websiteRoutes = require('./routes/website');
const methodOverride = require("method-override");
const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/app');
const config = require('./config/secret');
const app = express();
require('dotenv').config()

const sessionStore = new MongoStore({ url: config.database, autoReconnect: true });

const sessionMiddleware = session({
  resave: true,
  saveUninitialized: true,
  secret: 'process.env.SECRET',
  store: sessionStore
})

//Connection to the DB
mongoose.connect(config.database, {useFindAndModify: false}, function(err) {
  if (err) console.log(err);
  console.log("Connected to BlueRidge database");
});

// Various Library Use
app.set('view engine', 'ejs');
app.use(express.static('download'));
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(flash());

//saves the user session
app.use(sessionMiddleware);

//Passport Config
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

//local function
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

//Using the routes
app.use(userRoutes);
app.use(appRoutes);
app.use(websiteRoutes);
app.use('/auth', authRoutes);

// app.use(mainRoutes);


//Server listener
server = app.listen(config.port, (err) => {
  if (err) console.log(err);
  console.log(`Running on port ${config.port}`);
});

//socket.io instantiation
// const io = require("socket.io")(server)
// const Notification = require('./models/notifications');

// var users = 0;
// var address_list = new Array();
// //listen on every connection
// io.on('connection', (socket) => {
//   console.log('New user connected')
//   var address = socket.handshake.address;

//   if (address_list[address]) {
//     var socketid = address_list[address].list;
//   } else {
//     var socketid = new Array();
//     address_list[address] = new Array();
//   }

//   socketid.push(socket.id);
//   address_list[address].list = socketid;
//   users = Object.keys(address_list).length;

//   socket.emit('count', { count: users });
//   socket.broadcast.emit('count', { count: users });

//   Notification.find({}, function(err, todos) {
//     socket.emit('all', todos);
//   });

// 	//default username
// 	// socket.username = "Anonymous"

//     //listen on change_username
//     socket.on('change_username', (data) => {
//         socket.username = data.username
//     })

//     //listen on new_message
//     socket.on('new_notification', (data) => {
//       console.log('new transactions')
//       console.log(data)
//       var notifications = new Notification({
//         sender: socket.username,
//         recepient: data.recepient,
//         content: data.message,
//         read: false
//       })
//       notifications.save((err) =>{
//         if (err) throw err;
//         socket.emit('notify', notifications)
//       })
//         //broadcast the new message
//         // io.sockets.emit('new_message', {message : data.message, username : socket.username});
//     })

//     socket.on('read', (data) => {
//       Notification.findById(data.id, (err, notification) => {
//         if (err) throw err;
//         notification.read = true
//         notification.save((err) => {

//         })
//       })
//     })

//     //listen on typing
//     socket.on('typing', (data) => {
//     	socket.broadcast.emit('typing', {username : socket.username})
//     })

//     socket.on('disconnect', function() {
//       var socketid = address_list[address].list;
//       delete socketid[socketid.indexOf(socket.id)];
//       if (Object.keys(socketid).length == 0) delete address_list[address];
//       users = Object.keys(address_list).length;
//       socket.emit('count', { count: users });
//       socket.broadcast.emit('count', { count: users });
//     });
// })