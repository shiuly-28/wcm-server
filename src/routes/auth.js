const express = require('express');
const router = express.Router();
import authController from "/src/controllers.js"
// import AuthController as * from "/src/authController"

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/profile/update/:userId', profileController.updateProfile);

module.exports = router;