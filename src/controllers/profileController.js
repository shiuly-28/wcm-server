const Profile = require('../models/Profile');

// 1. Get Profile (Read)
exports.getProfile = async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.userId }).populate('user', ['firstName', 'lastName', 'username']);
        if (!profile) return res.status(404).json({ message: "Profile not found" });
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Create/Initial Profile (Post)
exports.createProfile = async (req, res) => {
    try {
        const newProfile = new Profile({
            user: req.body.userId, // Authenticated user ID
            ...req.body
        });
        const profile = await newProfile.save();
        res.status(201).json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Update Profile & Submit for Review (Put)
exports.updateProfile = async (req, res) => {
    try {
        let profile = await Profile.findOneAndUpdate(
            { user: req.params.userId },
            { $set: req.body },
            { new: true }
        );
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Delete Profile/User (Delete)
exports.deleteProfile = async (req, res) => {
    try {
        await Profile.findOneAndDelete({ user: req.params.userId });
        // Optionally User model thekeo delete korte paren
        res.json({ message: "Profile deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};