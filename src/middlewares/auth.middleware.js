import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../modles/user.model.js";
//verifies if a user exists or not

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    //get the access token from either cookies or from the http header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unathorized request");
    }

    //decode the token using jwt.verify() method
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //get the user from the decoded jwt token and drop the password and refresh token
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalild Access Token");
    }

    //add a new object to the request
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
