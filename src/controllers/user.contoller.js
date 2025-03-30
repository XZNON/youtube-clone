import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../modles/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
