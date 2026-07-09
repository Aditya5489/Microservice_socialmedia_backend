require("dotenv").config();
const express=require('express');
const connectDb=require('./utils/db');
const cors=require('cors')
const logger=require('./utils/logger')
const Redis=require('ioredis');
const helmet=require('helmet');
const postRoutes=require("./routes/post.routes")
const errorHandler=require('./middleware/errorHandler')
const {rateLimit}=require('express-rate-limit');
const {RedisStore}=require('rate-limit-redis');
const { connectRabbitMQ } = require("./utils/rabbitmq");


const app=express()
const PORT=process.env.PORT||3002;

connectDb();
const redisClient=new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(express.json());
app.use(cors())

app.use((req,res,next)=>{
    logger.info(`Recieved ${req.method} request to ${req.url}`);
    logger.info(`Request body,${req.body}`);
    next();
})

const createPostRateLimiter=rateLimit({
    windowMs:60*1000,
    max:15,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        logger.warn(`Create Post endpoint Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({success:false,message:"Too many requests"})
    },
    store:new RedisStore({
        sendCommand:(...args)=>redisClient.call(...args),
    }),
})

const remPostRateLimiter=rateLimit({
    windowMs:60*1000,
    max:50,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        logger.warn(`Create Post endpoint Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({success:false,message:"Too many requests"})

    },
    store:new RedisStore({
        sendCommand:(...args)=>redisClient.call(...args),
    }),
})

app.use('/api/posts/create-post',createPostRateLimiter);
app.use('/api/posts/all-posts',remPostRateLimiter);
app.use('/api/posts/:id',remPostRateLimiter);



app.use('/api/posts',(req,res,next)=>{
    req.redisClient=redisClient
    next()
},postRoutes)

app.use(errorHandler);

async function startServer() {
    try{
        await connectRabbitMQ();
        app.listen(PORT,()=>{
            logger.info(`Post service is running on port ${PORT}`);
        });
    }catch(error){
        logger.error('Failed to connect to server',error);
        process.exit(1);
    }
}

startServer();

process.on('unhandledRejection',(reason,promise)=>{
    logger.error('Unhandeled Rejection at',promise,"reason",reason);
})



