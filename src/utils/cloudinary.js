import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";
import { ApiResponse } from "./ApiResponse.js";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadCloudinary = async (loclaFilePath) => {
  try {
    if (!loclaFilePath) return null;

    //upload the file
    const response = await cloudinary.uploader.upload(loclaFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    // console.log("File uploaded on cloudinary", response.url);
    fs.unlinkSync(loclaFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(loclaFilePath); //remove the locally saved temp file as the upload fails
    return null;
  }
};

const deleteCloudinary = async (fileUrl) => {
  try {
    const matches = imageUrl.match(/\/v\d+\/([^\.]+)/);
    if (!matches) {
      throw new ApiError(401, "Invalid cloudinary url");
    }
    const publicId = matches[1];

    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        throw new ApiError(400, "could not delete image from cloudinary");
      } else {
        new ApiResponse(201, {}, "Image deleted successfully.");
      }
    });
  } catch (error) {
    throw new ApiError(401, "Error while deleting from cloudinary.");
  }
};

export { uploadCloudinary, deleteCloudinary };
