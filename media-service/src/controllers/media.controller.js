const logger=require('../utils/logger');
const Media=require('../models/Media');
const { uploadMediaToCloudinary } = require('../utils/cloudinary');

const uploadMedia=async(req,res)=>{
    logger.info("Starting media upload");
    try{
        if(!req.file){
            logger.error("File is not present. Please upload a file");
            return res.status(400).json({
                success:false,
                message:"File is not present. Please upload a file"
            })
        }
        const {originalname,mimetype,buffer}=req.file;
        const userId=req.user.userId;
        logger.info(`File details: name=${originalname},type=${mimetype}`);
        logger.info(`Uploading to cloudinary starting`);
        
        const cloudinaryResult=await uploadMediaToCloudinary(req.file);
        logger.info(`File uploaded successfully. PublicId: ${cloudinaryResult.public_id}`);
        const newMedia=new Media({
            publicId:cloudinaryResult.public_id,
            originalName:originalname,
            mimeType:mimetype,
            url:cloudinaryResult.secure_url,
            userId
        })
        await newMedia.save();
        res.status(201).json({
            success:true,
            mediaId:newMedia._id,
            url:newMedia.url,
            message:'Media uploaded successfully'
        })

    }catch(error){
        logger.error('Error uploading media',error);
        res.status(500).json({
            success:false,
            message:"Error uploading media"
        })

    }
};

const getAllMedias = async (req, res) => {
  try {
     const result =  await Media.find({userId : req.user.userId});

        if(result.length ===0){
           return res.status(404).json({
                success:false,
                message:"Cann't find any media for this user"
            })
        }
  } catch (e) {
    logger.error("Error fetching medias", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medias",
    });
  }
};

module.exports = { uploadMedia, getAllMedias };