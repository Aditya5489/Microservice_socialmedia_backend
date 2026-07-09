const logger=require('../utils/logger');

const errorHandler=(err,req,res,next)=>{
    logger.error(err.stack);
    req.status(err.status||500).json({
        message:err.message||'Internal server error',
    });
}

module.exports=errorHandler;