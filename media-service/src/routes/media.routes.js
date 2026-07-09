const express=require('express');
const multer=require('multer');
const router=express.Router();
const {uploadMedia,getAllMedias}=require('../controllers/media.controller');
const {authenticateRequests}=require('../middleware/authMiddleware');
const logger=require('../utils/logger');

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{
        fileSize:5*1024*1024
    }
}).single('file')

router.post(
    '/upload',
    authenticateRequests,
    (req, res, next) => {
        upload(req, res, function (err) {

            if (err instanceof multer.MulterError) {
                logger.error('Multer error while uploading', err);

                return res.status(400).json({
                    message: "Multer error while uploading",
                    error: err.message
                });
            }

            if (err) {
                logger.error('Unknown error occurred while uploading', err);

                return res.status(500).json({
                    message: "Unknown error occurred while uploading",
                    error: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: "No file uploaded"
                });
            }

            next();
        });
    },
    uploadMedia
);

router.get("/get", authenticateRequests, getAllMedias);

module.exports=router;