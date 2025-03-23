const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      next(err);
    });
  };
};

export { asyncHandler };

/*
//heigher order wrapper functioin
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next); //takes in the req and res and next and runs it in the passed function
  } catch (error) {
    res.status(error.code || 500).json({
      sucess: false,
      message: error.message,
    });
  }
};
*/
