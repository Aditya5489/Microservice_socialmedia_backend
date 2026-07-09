require('dotenv').config();
const express=require('express');
const logger=require('./utils/logger');
const connectDb=require('./utils/db');
const cors=require('cors')
const errorHandler=require('./middleware/errorHandler')
const helmet=require('helmet');
const mediaRoutes=require('./routes/media.routes')
const {rateLimit}=require('express-rate-limit');
const {RedisStore}=require('rate-limit-redis');
const Redis=require('ioredis');
const { connectRabbitMQ,consumeEvent } = require("./utils/rabbitmq");
const {handlePostDeleted}=require('./eventHandlers/mediaEventHandlers')

const app=express()
const PORT=process.env.PORT||3003;

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

const mediaUploadRateLimiter=rateLimit({
    windowMs:60*1000,
    max:5,
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

app.use('/api/media/upload',mediaUploadRateLimiter);

app.use('/api/media',(req,res,next)=>{
    req.redisClient=redisClient
    next()
},mediaRoutes)

async function startServer(){
    try{
        await connectRabbitMQ();
        await consumeEvent('post.deleted',handlePostDeleted)
        app.listen(PORT,()=>{
            logger.info(`Media service is running on port ${PORT}`);
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
