const cloudinary=require('cloudinary').v2;
const logger=require('./logger');


cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.API_KEY,
    api_secret:process.env.API_SECRET
});

const uploadMediaToCloudinary=(file)=>{
    return new Promise((resolve,reject)=>{
        const uploadStream=cloudinary.uploader.upload_stream({
            resource_type:"auto"
        },
        (error,result)=>{
            if(error){
                logger.error("Error uploading media to cloudinary",error.message),
                reject(error)
            }else{
                resolve(result);
            }
        }
       )
       uploadStream.end(file.buffer);

    })
}

const deleteMediaFromCloudinary=async(publicId)=>{
    try{
        const result=await cloudinary.uploader.destroy(publicId);
        logger.info("Media delected successfully from the cloud storage",publicId);
        return result;
    }catch(err){
        logger.error("Error while deleting media",err);
        throw err;
    }
}


module.exports={uploadMediaToCloudinary,deleteMediaFromCloudinary};