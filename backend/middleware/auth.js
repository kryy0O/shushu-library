// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'Please log in to access this resource'
    });
};

// Middleware to check if user is logged in (for views)
exports.checkAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        res.locals.isLoggedIn = true;
        res.locals.user = req.session.user;
    } else {
        res.locals.isLoggedIn = false;
    }
    next();
};