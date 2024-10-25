const mongoose = require('mongoose');

const socialLinkSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: true,
        enum: ['Facebook', 'Twitter', 'LinkedIn', 'Instagram', 'Other']
    },
    url: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

module.exports = mongoose.model('SocialLink', socialLinkSchema);
