const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
    const authHeader = req.get("Authorization");

    console.log(authHeader);

    const token = authHeader?.trim().split(/\s+/)[1];

    console.log(token);

    if (!token) {
        logger.warn("Access attempt without valid token");
        return res.status(401).json({
            success: false,
            message: "Authentication Required",
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log(err);          // ✅ err is valid here
            logger.warn("Invalid Token!");

            return res.status(401).json({
                success: false,
                message: err.message,
            });
        }

        req.user = user;
        next();
    });
};

module.exports = validateToken;