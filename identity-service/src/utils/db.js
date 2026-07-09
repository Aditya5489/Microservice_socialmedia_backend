const mongoose=require('mongoose');
const logger=require('./logger')

const connectDb=async()=>{
    try{
        const conn=await mongoose.connect(process.env.MONGODB_URI);
        logger.info("Successfully Connected to mongodb");
    }catch(err){
        logger.error("Error occured",err);
        process.exit(1);
    }
}

module.exports=connectDb;