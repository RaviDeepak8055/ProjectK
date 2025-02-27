const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['donation', 'request'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'requested', 'accepted', 'cancelled'],
    default: 'available'
  },
  matchedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    default: null
  },
  // Add any other fields you have in your food schema
});

foodSchema.statics.findMatches = async function() {
  const donations = await this.find({ type: 'donation', status: 'available' });
  const requests = await this.find({ type: 'request', status: 'available' });

  for (const donation of donations) {
    for (const request of requests) {
      if (donation.quantity === request.quantity) {
        donation.matchedWith = request._id;
        request.matchedWith = donation._id;
        donation.status = 'requested';
        request.status = 'requested';
        await donation.save();
        await request.save();
      }
    }
  }
};

module.exports = mongoose.model('Food', foodSchema);
