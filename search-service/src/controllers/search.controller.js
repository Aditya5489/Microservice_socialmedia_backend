const Search=require('../models/Search');
const logger=require('../utils/logger');

const searchPostController=async(req,res)=>{
    logger.info('Search endpoint hit ..')
    try{
        const {query}=req.query;
        const cacheKey=`search:${query.toLowerCase().trim()}`
        const cachedData=await req.redisClient.get(cacheKey);
        if(cachedData){
            return res.json(JSON.parse(cachedData));
        }

        const results=await Search.find({
            $text:{$search:query}
        },{
            score:{$meta:'textScore'}
        }).sort({score:{$meta:'textScore'}}).limit(10);

        await req.redisClient.setex(
            cacheKey,
            300,
            JSON.stringify(results)
        );
        res.json({results});

    }catch(err){
        logger.error("Error while searching",err);
        res.status(500).json({
            success:false,
            message:'Error while searching'
        });
    }
}

module.exports={searchPostController};