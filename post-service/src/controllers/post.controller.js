const Post=require('../models/Post');
const logger=require('../utils/logger');
const {validateCreatePost}=require('../utils/validation')
const {publishEvent}=require('../utils/rabbitmq')


async function invalidatePostCache(req,input) {
    const cachedKey=`post:${input}`;
    await req.redisClient.del(cachedKey);

    const keys=await req.redisClient.keys('posts:*');
    if(keys.length>0){
        await req.redisClient.del(keys);
    }
}

const createPost=async(req,res)=>{
    logger.info("CreatePost endpoint hit...")
    try{
       const {error}=validateCreatePost(req.body)
       if(error){
        logger.warn("Insufficient data for post",error.details[0].message);
        return res.status(400).json({
            success:false,
            message:error.details[0].message
        });
       }
       const {content,mediaIds}=req.body;
       const newPost=new Post({
        user:req.user.userId,
        content,
        mediaIds:mediaIds||[]

       })

       await newPost.save();

       await publishEvent('post.created',{
        postId:newPost._id.toString(),
        usreId:newPost.user.toString(),
        content:newPost.content,
        createdAt:newPost.createdAt
       })

       await invalidatePostCache(req, newPost._id.toString());
       
       logger.info("Post Created Successfully")
       res.status(201).json({
        success:true,
        message:"Post Created Successfully"
       })


    }catch(err){
        logger.error("Error creating Post",err);
        res.status(500).json({
            success:false,
            message:'Internal Server Error'
        });
    }
}

const getAllPosts=async(req,res)=>{
    try{
        const page=parseInt(req.query.page)||1;
        const limit=parseInt(req.query.limit)||10;
        const startIndex=(page-1)*limit;
        const cacheKey=`posts:${page}:${limit}`;
        const cachedPosts=await req.redisClient.get(cacheKey);
        if(cachedPosts){
            return res.json(JSON.parse(cachedPosts));
        }
        const posts=await Post.find({})
        .sort({createdAt:-1})
        .skip(startIndex).
        limit(limit);
        const totalNoPosts=await Post.countDocuments();
        const result={
            posts,
            currentpage:page,
            totalPages:Math.ceil(totalNoPosts/limit),
            totalPosts:totalNoPosts
        }
        await req.redisClient.setex(cacheKey,300,JSON.stringify(result))
        res.json(result);

    }catch(err){
        logger.error("Error fetching Post",err);
        res.status(500).json({
            success:false,
            message:'Internal Server Error'
        });
    }
}

const getPost=async(req,res)=>{
    try{
        const postId=req.params.id;
        const cacheKey=`post:${postId}`;
        const cachedPost=await req.redisClient.get(cacheKey);
        if(cachedPost){
            return res.json(JSON.parse(cachedPost));
        }
        const postById=await Post.findById(postId);
        if(!postById){
            return res.status(404).json({
                success:false,
                message:"Post Not found"
            })
        }
        await req.redisClient.setex(
            cacheKey,
            3600,
            JSON.stringify(postById)
        );
        res.json(postById);

    }catch(err){
        logger.error("Error getting Post",err);
        res.status(500).json({
            success:false,
            message:'Internal Server Error'
        });
    }
}

const deletePost=async(req,res)=>{
    try{
        const post=await Post.findOneAndDelete({
            _id:req.params.id,
            user:req.user.userId
        })
        if(!post){
            return res.status(404).json({
                success:false,
                message:"Post not found"
            })
        }
        await publishEvent('post.deleted',{
            postId:post._id.toString(),
            userId:req.user.userId,
            mediaIds:post.mediaIds
        });
        await invalidatePostCache(req,req.params.id);
        res.json({
            message:"Post deleted Successfully"
        })

    }catch(err){
        logger.error("Error deleting Post",err);
        res.status(500).json({
            success:false,
            message:'Internal Server Error'
        });
    }
}

module.exports={createPost,getAllPosts,getPost,deletePost};

