const express = require('express');
const Food = require('../models/Food');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', auth, async (req, res) => {
  try {
    const requests = await Food.find({ 
      userId: req.user._id, 
      type: 'request',
      status: { $in: ['requested', 'accepted', 'cancelled'] } 
    }).populate({
      path: 'matchedWith',
      populate: {
        path: 'userId',
        select: 'name email phone address'
      }
    });

    console.log('Requests:', requests);

    res.render('organizationDashboard', { 
      requests,
      user: req.user
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(error.message);
  }
});

// Update the accept donation route
router.post('/accept-donation/:id', auth, async (req, res) => {
  try {
    const request = await Food.findById(req.params.id);
    if (!request) {
      return res.status(404).send('Request not found');
    }

    // Update the request status first
    request.status = 'accepted';
    await request.save();

    // Then update the donation status
    const donation = await Food.findById(request.matchedWith);
    if (donation) {
      donation.status = 'accepted';
      await donation.save();
    }

    // Add console log for debugging
    console.log('Updated request:', request);
    console.log('Updated donation:', donation);

    res.redirect('/organization/dashboard');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(error.message);
  }
});

// Update the cancel request route
router.post('/cancel-request/:id', auth, async (req, res) => {
  try {
    const request = await Food.findById(req.params.id);
    if (!request) {
      return res.status(404).send('Request not found');
    }

    // Find and update the matched donation
    const donation = await Food.findById(request.matchedWith);
    if (donation) {
      donation.status = 'cancelled';
      donation.matchedWith = null;
      await donation.save();
    }

    // Update the request
    request.status = 'cancelled';
    request.matchedWith = null;
    await request.save();

    res.redirect('/organization/dashboard');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(error.message);
  }
});

module.exports = router;
