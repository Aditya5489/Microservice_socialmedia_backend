const logger=require('../utils/logger')
const Search=require('../models/Search')
const Redis = require("ioredis");

const redisClient = new Redis(process.env.REDIS_URL);

async function invalidatePostCache(postId){
    const cachedKey=`post:${postId}`;
    await redisClient.del(cachedKey);

    const keys=await redisClient.keys('posts:*');
    if(keys.length>0){
        await redisClient.del(keys);
    }
}

async function handlePostCreated(event){
    try{
        const newSearchPost=new Search(
            {
                postId:event.postId,
                userId:event.userId,
                content:event.content,
                createdAt:event.createdAt
            }
        )
        await newSearchPost.save();
        await invalidatePostCache(event.postId)
        logger.info(`Search post created:${event.postId},${newSearchPost._id.toString()}`)

    }catch(err){
        logger.error('Error handling post creation event',err)
    }
}

async function handlePostDeleted(event){
    try{
        await Search.findOneAndDelete({
            postId:event.postId
        })
        await invalidatePostCache(event.postId);
        logger.info(`Search Post deleted ${event.postId}`);
    }catch(err){
        logger.error('Error handling post deletion event',err)       
    }
}


module.exports={handlePostCreated,handlePostDeleted};