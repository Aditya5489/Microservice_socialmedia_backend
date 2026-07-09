const express=require('express');
const {searchPostController}=require('../controllers/search.controller');
const {authenticateRequests}=require('../middleware/authMiddleware')

const router=express.Router();

router.use(authenticateRequests);

router.get("/posts",searchPostController);

module.exports=router;