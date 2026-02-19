const express = require('express');
const router = express.Router();

// @route   GET /api/profile/:username
// @desc    Display user profile (username, bio, images, links, etc.)
router.get('/:username', (req, res) => {});

// @route   POST /api/profile/create
// @desc    Create/Initialize profile data
router.post('/create', (req, res) => {});

// @route   PUT /api/profile/update
// @desc    Update bio, links, city, country, or "Submit for Review"
router.put('/update', (req, res) => {});

// @route   DELETE /api/profile/delete/:id
// @desc    Delete user account/profile
router.delete('/delete/:id', (req, res) => {});

module.exports = router;