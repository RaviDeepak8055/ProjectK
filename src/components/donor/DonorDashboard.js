import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../config/supabase';
import './DonorDashboard.css';
import Header from '../common/Header';

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [formData, setFormData] = useState({
    quantity: '',
    description: ''
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (!session) {
        navigate('/login?type=donor');
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.user_type !== 'donor') {
        navigate('/login?type=donor');
        return;
      }

      setUser(session.user);
      setProfile(profile);
      fetchDonations(session.user.id);
    } catch (error) {
      console.error('Authentication error:', error);
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
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to submit a donation');
      }

      const { data, error } = await supabase
        .from('donations')
        .insert([
          {
            user_id: session.user.id,
            quantity: parseInt(formData.quantity),
            description: formData.description,
            status: 'available'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update donations list
      setDonations(current => [data, ...current]);

      // Reset form
      setFormData({
        quantity: '',
        description: ''
      });
    } catch (error) {
      console.error('Submission error:', error);
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
        <h1 className="donor-welcome">Welcome!</h1>
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
            <div className="donations-list-container">
              <table className="donations-table">
                <thead className="table-header">
                  <tr className="header-row">
                    <th className="header-cell">Organization</th>
                    <th className="header-cell">Contact</th>
                    <th className="header-cell">Quantity</th>
                    <th className="header-cell">Description</th>
                    <th className="header-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {donations.map(donation => (
                    <tr key={donation.id} className="table-row">
                      <td className="table-cell">
                        {donation.organization ? donation.organization.name : '-'}
                      </td>
                      <td className="table-cell">
                        {donation.organization ? donation.organization.phone : '-'}
                      </td>
                      <td className="table-cell">{donation.quantity} kg</td>
                      <td className="table-cell">{donation.description}</td>
                      <td className="table-cell">
                        <span className={`status-badge status-${donation.status}`}>
                          {donation.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default DonorDashboard;
