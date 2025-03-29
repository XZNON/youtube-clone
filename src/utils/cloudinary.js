import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

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
    console.log("File uploaded on cloudinary", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(loclaFilePath); //remove the locally saved temp file as the upload fails
    return null;
  }
};

export { uploadCloudinary };
