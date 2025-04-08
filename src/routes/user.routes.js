import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.contoller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = Router();

router.route("/register").post(
  upload.fields([
    //middleware that stores the avatar and images in a file before executing regiserUser
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails); //user .patch or else everyting will be changed
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar); //another middleware-upload.single(only one file) from multer
router
  .route("/conver-image")
  .path(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
// "/c/:" will get the  passed in value in the params
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);
export default router;
