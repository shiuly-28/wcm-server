const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    bio: { type: String, maxLength: 500 },
    profileImage: { type: String }, // Image path ba URL
    coverImageUrl: { type: String },
    
    // Location & Language
    country: { type: String },
    city: { type: String },
    language: { type: String, default: 'English' },
    
    // Links
    websiteLink: { type: String },
    socialLink: { type: String },
    
    // Review System
    submitLink: { type: String },
    isSubmittedForReview: { type: Boolean, default: false },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected'], 
        default: 'Pending' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);