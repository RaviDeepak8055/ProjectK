import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import './AvailableDonations.css';

const AvailableDonations = ({ requestQuantity, requestId }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [requestStatus, setRequestStatus] = useState('pending');

  useEffect(() => {
    fetchUser();
    fetchAvailableDonations();
    fetchRequestStatus();
  }, [requestQuantity, requestId]);

  const fetchUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      // Get organization profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      setUser(user);
      setProfile(profile);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchRequestStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('status, matched_donation_id')
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequestStatus(data.status);
    } catch (error) {
      console.error('Error fetching request status:', error);
    }
  };

  const fetchAvailableDonations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          donor:profiles!donations_user_id_fkey (
            id,
            name,
            city
          )
        `)
        .eq('status', 'available')
        .gte('quantity', requestQuantity)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDonation = async (donationId) => {
    try {
      // First update the donation
      const updateData = {
        status: 'accepted',
        organization_id: user.id,
        matched_request_id: requestId
      };

      const { error: donationError } = await supabase
        .from('donations')
        .update(updateData)
        .eq('id', donationId);

      if (donationError) {
        console.error('Error updating donation:', donationError);
        throw donationError;
      }

      // Then update the request
      const { error: requestError } = await supabase
        .from('requests')
        .update({ 
          status: 'matched',
          matched_donation_id: donationId
        })
        .eq('id', requestId);

      if (requestError) {
        console.error('Error updating request:', requestError);
        throw requestError;
      }

      // Create notification for donor
      const donation = donations.find(d => d.id === donationId);
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          donor_id: donation.user_id,
          organization_id: user.id,
          donation_id: donationId,
          request_id: requestId,
          message: `${profile.name} has accepted your donation of ${requestQuantity}kg food.`,
          status: 'unread'
        }]);

      if (notificationError) throw notificationError;

      setRequestStatus('matched');
      fetchAvailableDonations();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCancelRequest = async () => {
    try {
      // First get the request details
      const { data: request, error: requestFetchError } = await supabase
        .from('requests')
        .select('matched_donation_id')
        .eq('id', requestId)
        .single();

      if (requestFetchError) throw requestFetchError;

      if (request.matched_donation_id) {
        // Get the donation details first
        const { data: donation, error: donationFetchError } = await supabase
          .from('donations')
          .select('user_id')
          .eq('id', request.matched_donation_id)
          .single();

        if (donationFetchError) throw donationFetchError;

        // Update the donation back to available
        const { error: donationError } = await supabase
          .from('donations')
          .update({ 
            status: 'available',
            organization_id: null,
            matched_request_id: null
          })
          .eq('id', request.matched_donation_id);

        if (donationError) throw donationError;

        // Create notification for donor
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            donor_id: donation.user_id,
            organization_id: user.id,
            donation_id: request.matched_donation_id,
            request_id: requestId,
            message: `${profile.name} has cancelled their request. Your donation is now available for other organizations.`,
            status: 'unread'
          }]);

        if (notificationError) throw notificationError;
      }

      // Update request status to cancelled
      const { error: requestError } = await supabase
        .from('requests')
        .update({ 
          status: 'cancelled',
          matched_donation_id: null 
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      setRequestStatus('cancelled');
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="available-donations">
      <h3>Available Matching Donations</h3>
      {loading ? (
        <div className="loading-container">
          <p>Loading available donations...</p>
        </div>
      ) : (
        <div className="donations-grid">
          {donations.map(donation => (
            <div key={donation.id} className="donation-match-card">
              <div className="donation-details">
                <h4>Donation Details</h4>
                <p><strong>Quantity:</strong> {donation.quantity} kg</p>
                <p><strong>Serves:</strong> {donation.serving_size} people</p>
                {donation.donor && (
                  <>
                    <p><strong>Donor:</strong> {donation.donor.name}</p>
                    <p><strong>Location:</strong> {donation.donor.city}</p>
                  </>
                )}
                <p><strong>Description:</strong> {donation.description}</p>
              </div>
              {requestStatus === 'matched' ? (
                <button 
                  onClick={handleCancelRequest}
                  className="cancel-btn"
                >
                  Cancel Request
                </button>
              ) : (
                <button 
                  onClick={() => handleAcceptDonation(donation.id)}
                  className="accept-btn"
                >
                  Accept Donation
                </button>
              )}
            </div>
          ))}
          {donations.length === 0 && (
            <p className="no-donations">No matching donations available at the moment.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailableDonations;
