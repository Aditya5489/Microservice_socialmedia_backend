require('dotenv').config();
const express=require('express');
const connectDb=require('./utils/db');
const app=express();
const helmet=require('helmet');
const cors=require('cors')
const logger=require('./utils/logger')
const {RateLimiterRedis}=require('rate-limiter-flexible')
const Redis=require('ioredis');
const {rateLimit}=require('express-rate-limit');
const {RedisStore}=require('rate-limit-redis')
const authRoutes=require('./routes/identity.route')
const errorHandler=require('./middleware/errorHandler')
const PORT=process.env.PORT||3001

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

const rateLimiter=new RateLimiterRedis({
    storeClient:redisClient,
    keyPrefix:'middleware',
    points:10,//max no. of request
    duration:1//1 sec
})

app.use((req,res,next)=>{
    rateLimiter.consume(req.ip).then(()=>next()).catch(()=>{
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({success:false,message:"Too many requests"});
    })
})

const sensitiveEndpointsLimiter=rateLimit({
    windowMs:15*60*1000,
    max:50,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        logger.warn(`Sensitive endpoint Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({success:false,message:"Too many requests"})
    },
    store:new RedisStore({
        sendCommand:(...args)=>redisClient.call(...args),
    }),
})

app.use('/api/auth/register',sensitiveEndpointsLimiter)

app.use('/api/auth',authRoutes)

app.use(errorHandler);

app.listen(PORT,()=>{
    logger.info(`Identity service is running on port ${PORT}`);
});

process.on('unhandledRejection',(reason,promise)=>{
    logger.error('Unhandeled Rejection at',promise,"reason",reason);
})