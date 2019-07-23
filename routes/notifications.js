const router = require('express').Router();
const middleware = require("../middleware")
const Notification = require('../models/notifications');



router.route('/notifications')
  .get(middleware.isLoggedIn, (req, res, next) => {
    Notification.findById({_id: req.user._id}, (err, notification) => {
        if (err) return next(err)
        var unread_notification = []
        for (i=0;i<notification.length;i++){
            if (notification[i].read === false){
                unread_notification.push(notification)
            }
        }
        console.log(unread_notification)
    })
  })
  .post(middleware.isLoggedIn, (req, res, next) => {
    Notification.update({_id:req.user._id}, {read:true}, {multi: true}, function (err, docs) {
        if (err) return next(err)
        res.redirect('/transactions');
    })
  })