import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../modles/user.model.js";
import { deleteCloudinary, uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

//helper function to generate access and refresh tokens for a user
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId); //find the user from userId
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSafe: false }); //dont need to pass in required fields when saving

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

//regiseter the user
const registerUser = asyncHandler(async (req, res) => {
  //get details from the user
  //validation-not empty
  //check if user already exists: username,email
  //check for images,check for avatar
  //upload them to cloudinary, avatar
  //create user object - create entry in db
  //remove password and refresh token field
  //check for user creatioin
  //return res

  //get details from the user
  const { fullName, email, username, password } = req.body;
  // console.log("email:", email);

  //   if (fullName==""){
  //     throw new ApiError(400,"Full name is required")
  //   }

  //validation: check if any field in empty: if empty throw ApiError()
  if (
    [fullName, email, username, password].some((field) => field?.trim() == "") //some function that checks if all the params are filled
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //check if a user already exists, if yes throw ApiError()
  const existedUser = await User.findOne({
    $or: [{ username }, { email }], //$or:[{},{},..] to check for multiple variables
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists.");
  }

  //check for avatar and coverImage
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //check if avatar is given
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required.");
  }

  //upload on cloudinary
  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required.");
  }

  //create a user object with the information
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // hide the password and refreshToken
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user.");
  }
  //return the ApiResponse
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User has been created."));
});

//login the user
const loginUser = asyncHandler(async (req, res) => {
  //req body
  //username or email
  //find the user
  //password check
  //access and refresh token
  //send cookies
  //send response

  //get data from body
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or password is required.");
  }

  //find the user from the database
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  //check if the user password is correct

  //isPasswordCorrect() defined in the user.model.js, pass in the password from the user and it will check if it is correct using the function
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password incorrect");
  }

  //get access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // const loggedInUser = await User.findById(user._id).select("avatar");

  //options for cookies
  const options = {
    //cookies can only be modified by the server
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) //pass in the cookies, from cookie-parser
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggend in successfully"
      )
    );
});

//logout the user
const logoutUser = asyncHandler(async (req, res) => {
  //we can access user because we authorized it using aut.middleware.js middleware
  await User.findByIdAndUpdate(
    req.user._id,
    {
      //mongoose object to change User fields
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  //options for cookies
  const options = {
    //cookies can only be modified by the server
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options) //clear the cookies
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

//refresing access token, comapring refresh tokens from web and server and generating new access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  //get the refresh token from cookies of the req.body
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "unauthorized response");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // find the user from the databse using moongoose query
    // get the refresh token saved in the database
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    //compare the incoming refresh token from the web with the refresh token in the database
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used.");
    }

    //if all the checks are complete generate new access and refresh tokens
    accessToken,
      (newRefreshToken = await generateAccessAndRefreshTokens(user._id));
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "access token refreshed successfully."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

//change the current password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  // const { oldPassword, newPassword, confPassword } = req.body;

  // if (!(newPassword === confPassword)) {
  //   throw new ApiError(401, "new passwords should match");
  // }

  //get the user id as we have access to user from auth middleware
  const user = await User.findById(req.user?._id);
  //check if the password entered is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); //user.model method to check if  the password is correct

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  //change the old password to new password
  user.password = newPassword;
  //save to the databse
  //validateBeforeSavs:false to not check for other fields to be there
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully."));
});

//fetch the current user from the databse
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully."));
});

//change other details {username,email,fullName}
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, username } = req.body;

  if (!fullName || !email || username) {
    throw new ApiError(400, "All fields are required.");
  }

  const user = await User.findByIdAndUpdate(
    //always write await while talking to the database
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        username: username,
      },
    },
    { new: true } //after updating you will get the new changed data
  ).select("-password");

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //get req.file from multer middleware
  const avatarLocalPath = req.file?.path;

  //find the old avatar url and delete it
  const oldUserAvatarPath = await User.findById(req.user?._id).select("avatar");

  if (!oldUserAvatarPath) {
    throw new ApiError(400, "Error while fetching old avatar url");
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //upload the avatar on cloudinary
  const avatar = await uploadCloudinary(avatarLocalPath);

  await deleteCloudinary(oldUserAvatarPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  //dont need user.save() if we use findByIdAndUpdate()

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar has been updated successfully."));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  //get the local path from multer middleware
  const coverImageLocalPath = req.file?.path;

  //delete the old cover photo from cloudinary
  const oldUserCoverImageUrl = await User.findById(req.user?._id).select(
    "coverImage"
  );

  if (!oldUserCoverImageUrl) {
    throw new ApiError(
      400,
      "Error while fetching url for the old cover image from cloudinary."
    );
  }

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  //upload the cover image in cloudinary
  const coverImage = await uploadCloudinary(coverImageLocalPath);
  await deleteCloudinary(oldUserCoverImageUrl);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  //get the username of the channel from the params not the body, i.e., the url
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  //use aggeregation pipelines to get the user from the database
  const channel = await User.aggregate([
    //find the user in the database
    {
      $match: { username: username?.toLowerCase() },
    },
    //find the subscribers of a channel
    {
      $lookup: {
        from: "subscription", //from subscription schema
        localField: "_id", //id is the local fields
        foreignField: "channel", //to the the subscribers select all the channels
        as: "subscribers",
      },
    },
    {
      //find the channels youve subscribed to
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        //find the count of subscribers and subscribed to using $size
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "subscribedTo",
        },
        //check if a user is subscribed to a channel
        isSubscribed: {
          //$cond to give an if then and  else statement
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //check if the user is in subscribers, search for subscriber in subscribers field
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully.")
    );
});

//get the user's watch history,
//join the users with videos mode and get the video _id,
//again join the owner field(video model) with the user field to get the data of the uploader using sub pipelines
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        // req.user._id : this will not work with aggeregation pipelines
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          //a sub-pipeline to get the owners  from the users, we are in video model
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                //another sub-pipline inside a pipeline to only get required fields from the previous pipeline
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            //another pipeline to make it easier to get data from the array
            $addFields: {
              owner: {
                $first: "$owner", //override the first element of the owner field to the new owner field with the pipeline data
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
