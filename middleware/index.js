//All middleware goes here
var middlewareObj = {};


//Helper function to check if user is logged in
middlewareObj.isLoggedIn = function(req, res, next){
     if(req.isAuthenticated()){
        return next();
    }
    req.flash("error",  "You need to be logged in to do that!")
    res.redirect("/auth/login");
}

module.exports = middlewareObj;