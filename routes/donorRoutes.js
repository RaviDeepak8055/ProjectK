const express = require('express');
const Food = require('../models/Food');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', auth, async (req, res) => {
  try {
    const donations = await Food.find({ userId: req.user._id, type: 'donation' })
      .populate({
        path: 'matchedWith',
        populate: {
          path: 'userId',
          select: 'name email phone address'
        }
      });

    res.render('donorDashboard', { 
      donations,
      user: req.user
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/accept-donation/:id', auth, async (req, res) => {
  try {
    const donation = await Food.findById(req.params.id);
    if (!donation) {
      return res.status(404).send('Donation not found');
    }

    const request = await Food.findById(donation.matchedWith);
    if (request) {
      request.status = 'accepted';
      await request.save();
    }

    donation.status = 'accepted';
    await donation.save();

    res.redirect('/donor/dashboard');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/cancel-donation/:id', auth, async (req, res) => {
  try {
    const donation = await Food.findById(req.params.id);
    if (!donation) {
      return res.status(404).send('Donation not found');
    }

    // Find and update the matched request
    const request = await Food.findById(donation.matchedWith);
    if (request) {
      request.status = 'cancelled';
      request.matchedWith = null;
      await request.save();
    }

    // Update the donation
    donation.status = 'cancelled';
    donation.matchedWith = null;
    await donation.save();

    res.redirect('/donor/dashboard');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
