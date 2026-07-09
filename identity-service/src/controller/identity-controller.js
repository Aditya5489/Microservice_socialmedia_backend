const User=require('../models/User');
const logger=require('../utils/logger');
const {validateRegistration,validateLogin}=require('../utils/validation');
const generateToken=require('../utils/generateToken')
const RefreshToken=require('../models/RefreshToken')

const registerUser=async(req,res)=>{
    logger.info('Registration endpoint hit...')
    try{
        const {error}=validateRegistration(req.body);
        if(error){
            logger.warn('validation error',error.details[0].message);
            return res.status(400).json({
                success:false,
                message:error.details[0].message
            });
        }
        const {username,email,password}=req.body;
        let user=await User.findOne({ $or:[{email},{username}]});
        if(user){
            logger.warn('User already exists');
            return res.status(400).json({
                success:false,
                message:"User already exists"
            });
        }
        user=new User({username,email,password});
        await user.save();
        logger.warn('User saved successfully',user._id);
        const {accessToken,refreshToken}=await generateToken(user);
        res.status(201).json({
            success:true,
            message:"User registered successfully",
            accessToken,
            refreshToken
        })
    }catch(err){
        logger.error("Registration error Occured",err);
        res.status(500).json({
            success:false,
            message:"Internal server error"
        })
    }
}

const loginUser=async(req,res)=>{
    logger.info('Login endpoint hit...');
    try{
        const {error}=validateLogin(req.body);
        if(error){
            logger.warn('Validation error',error.details[0].message);
            return res.status(400).json({
                success:false,
                message:error.details[0].message
            });
        }
        const {email,password}=req.body;
        const user=await User.findOne({email})
        if(!user){
            logger.warn("Invalid User");
            return res.status(400).json({
                success:false,
                message:"Invalid Credentials"
            })
        }
        const isValidPassword=await user.comparePassword(password);
        if(!isValidPassword){
            logger.warn("Incorrect Password");
            return res.status(400).json({
                success:false,
                message:"Invalid Password"
            })
        }
        const {accessToken,refreshToken}=await generateToken(user);
        res.status(200).json({
            accessToken,
            refreshToken,
            userId:user._id
        })

    }catch(err){
        logger.error(`Login Error Occurred`,err);
        res.status(500).json({
            success:false,
            message:"Internal Server error"
        })
    }
}

const refreshTokenUser=async(req,res)=>{
    logger.info("Refresh Token endpoint hit...");
    try{
        const {refreshToken}=req.body;
        if(!refreshToken){
            logger.warn("Refresh Token is missing");
            return res.status(400).json({
                success:false,
                message:"Refresh Token is missing"
            })
        }
        const storedToken=await RefreshToken.findOne({token:refreshToken})
        if(!storedToken||storedToken.expiresAt<new Date()){
            logger.warn("Invalid or Expired refresh Token");
            return res.status(401).json({
                success:false,
                message:"Invalid or Expired refresh Token"
            })
        }
        const user=await User.findById(storedToken.user)
        if(!user){
            logger.warn("User not found");
            return res.status(401).json({
                success:false,
                message:"User not found"
            })
        }
        const {accessToken:newAccessToken,refreshToken:newRefreshToken}=await generateToken(user);
        await RefreshToken.deleteOne({_id:storedToken._id})
        res.json({
            accessToken:newAccessToken,
            refreshToken:newRefreshToken
        })

    }catch(err){
        logger.error(`Refresh Token Error Occurred`,err);
        res.status(500).json({
            success:false,
            message:"Internal Server error"
        })
    }
}

const logoutUser=async(req,res)=>{
    logger.info("Logout endpoint hit...");
    try{
        const {refreshToken}=req.body;
        if(!refreshToken){
            logger.warn("Refresh Token is missing");
            return res.status(400).json({
                success:false,
                message:"Refresh Token is missing"
            })
        }
        await RefreshToken.deleteOne({token:refreshToken})
        logger.info('Refresh token deleted for logout')
        res.json({
            success:true,
            message:"Logged out Successfully"
        })
    }catch(err){
        logger.error(`Error Occurred while Logging out`,err);
        res.status(500).json({
            success:false,
            message:"Internal Server error"
        })
    }
}

module.exports={registerUser,loginUser,refreshTokenUser,logoutUser};