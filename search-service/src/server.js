require("dotenv").config();
const express=require('express');
const connectDb=require('./utils/db');
const cors=require('cors')
const logger=require('./utils/logger')
const Redis=require('ioredis');
const helmet=require('helmet');
const errorHandler=require('./middleware/errorHandler')
const {rateLimit}=require('express-rate-limit');
const {RedisStore}=require('rate-limit-redis');
const { connectRabbitMQ,cosumeEvent, consumeEvent} = require("./utils/rabbitmq");
const searchRoutes=require('./routes/search.route');
const { handlePostCreated,handlePostDeleted } = require("./eventHandlers/search.eventHandler");


const app=express()
const PORT=process.env.PORT||3004;

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

const searchtRateLimiter=rateLimit({
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

app.use('/api/search/posts',searchtRateLimiter)

app.use('/api/search',(req,res,next)=>{
    req.redisClient=redisClient
    next()
},searchRoutes)

app.use(errorHandler);

async function startServer(){
    try{
        await connectRabbitMQ();
        await consumeEvent('post.created',handlePostCreated);
        await consumeEvent('post.deleted',handlePostDeleted);        
        app.listen(PORT,()=>{
            logger.info(`Seach service is running on port ${PORT}`);
        })

    }catch(err){
            logger.error(0,'Failed to start search server');
            process.exit(1);
    }

}

startServer();

process.on('unhandledRejection',(reason,promise)=>{
    logger.error('Unhandeled Rejection at',promise,"reason",reason);
})