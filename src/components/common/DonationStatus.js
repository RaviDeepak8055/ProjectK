import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import './DonorDashboard.css';
import Header from '../common/Header';

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [formData, setFormData] = useState({
    quantity: '',
    serving_size: '',
    description: ''
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.user_type !== 'donor') {
        navigate('/login?type=donor');
        return;
      }

      setUser(user);
      setProfile(profile);
      fetchDonations(user.id);
    } catch (error) {
      console.error('Error:', error);
      navigate('/login?type=donor');
    }
  };

  const fetchDonations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          organization:profiles!donations_organization_id_fkey (
            name,
            organization_type,
            phone,
            city,
            address
          ),
          matched_request:requests!donations_matched_request_id_fkey (
            id,
            quantity,
            description,
            status
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('donations')
        .insert([
          {
            user_id: user.id,
            quantity: parseInt(formData.quantity),
            serving_size: parseInt(formData.serving_size),
            description: formData.description,
            status: 'available'
          }
        ]);

      if (error) throw error;

      setFormData({
        quantity: '',
        serving_size: '',
        description: ''
      });

      fetchDonations(user.id);
    } catch (error) {
      console.error('Error creating donation:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <Header userType="donor" />
      <div className="donor-dashboard">
        <h1>Donor Dashboard</h1>
        {profile && (
          <div className="profile-info">
            <p>Welcome, {profile.name}!</p>
          </div>
        )}
        
        <div className="dashboard-content">
          <section className="donation-form-section">
            <h2>Create New Donation</h2>
            <form onSubmit={handleSubmit} className="donation-form">
              <div className="form-group">
                <label>Quantity (in kg)</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Serves (number of people)</label>
                <input
                  type="number"
                  name="serving_size"
                  value={formData.serving_size}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your donation..."
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                Submit Donation
              </button>
            </form>
          </section>

          <section className="donations-section">
            <h2>Your Donations</h2>
            <div className="donations-list">
              {donations.map(donation => (
                <div key={donation.id} className="donation-card" data-status={donation.status}>
                  <h3>Donation #{donation.id.slice(0, 8)}</h3>
                  <div className="donation-details">
                    <p><strong>Quantity:</strong> {donation.quantity} kg</p>
                    <p><strong>Serves:</strong> {donation.serving_size} people</p>
                    <p><strong>Description:</strong> {donation.description}</p>
                    <p><strong>Status:</strong> {donation.status}</p>
                    <p><strong>Created:</strong> {new Date(donation.created_at).toLocaleDateString()}</p>

                    {/* Show organization details if donation is accepted */}
                    {donation.status === 'accepted' && donation.organization && (
                      <div className="organization-details">
                        <h4>Organization Details</h4>
                        <p><strong>Name:</strong> {donation.organization.name}</p>
                        <p><strong>Type:</strong> {donation.organization.organization_type}</p>
                        <p><strong>Phone:</strong> {donation.organization.phone}</p>
                        <p><strong>City:</strong> {donation.organization.city}</p>
                        <p><strong>Address:</strong> {donation.organization.address}</p>
                      </div>
                    )}

                    {/* Show request details if matched */}
                    {donation.matched_request && (
                      <div className="request-details">
                        <h4>Request Details</h4>
                        <p><strong>Quantity Needed:</strong> {donation.matched_request.quantity} kg</p>
                        <p><strong>Description:</strong> {donation.matched_request.description}</p>
                        <p><strong>Status:</strong> {donation.matched_request.status}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {donations.length === 0 && (
                <p className="no-donations">No donations yet</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default DonorDashboard;
