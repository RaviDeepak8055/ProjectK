import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../config/supabase';
import Header from '../common/Header';
import './OrganizationDashboard.css';
import { FaChevronDown } from 'react-icons/fa';

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    quantity: '',
    description: ''
  });
  const [requests, setRequests] = useState([]);
  const [matchedDonations, setMatchedDonations] = useState([]);
  const [previousDonations, setPreviousDonations] = useState([]);
  const [lastRequestData, setLastRequestData] = useState(null);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [expandedDonors, setExpandedDonors] = useState({});

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchPreviousDonations(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Load matches from localStorage on component mount
    const savedMatches = localStorage.getItem('matchedDonations');
    if (savedMatches) {
      setMatchedDonations(JSON.parse(savedMatches));
    }
    
    // Load lastRequestData from localStorage
    const savedLastRequest = localStorage.getItem('lastRequestData');
    if (savedLastRequest) {
      setLastRequestData(JSON.parse(savedLastRequest));
    }
  }, []);

  useEffect(() => {
    if (user?.id && requests.length > 0) {
      fetchMatchesWithData();
    }
  }, [user, requests]);

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

      if (profile.user_type !== 'organization') {
        navigate('/login?type=organization');
        return;
      }

      setUser(user);
      setProfile(profile);
      fetchRequests(user.id);
    } catch (error) {
      console.error('Error:', error);
      navigate('/login?type=organization');
    }
  };

  const fetchRequests = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      
      if (data && data.length > 0) {
        const lastRequest = data[0];
        setLastRequestData(lastRequest);
        // Store lastRequest in localStorage
        localStorage.setItem('lastRequestData', JSON.stringify(lastRequest));
        fetchMatchesWithData();
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchMatchesWithData = async () => {
    try {
      // Get all pending requests quantities
      const requestQuantities = requests.map(req => req.quantity);
      
      // Fetch all available donations that match our quantities
      const { data: donations, error } = await supabase
        .from('donations')
        .select(`
          *,
          donor:profiles!donations_user_id_fkey (
            id,
            name,
            phone,
            city,
            address
          )
        `)
        .eq('status', 'available')  // Changed from 'pending' to 'available'
        .in('quantity', requestQuantities)
        .is('organization_id', null); // Only get donations that haven't been accepted

      if (error) throw error;

      // Update matched donations in state and localStorage
      setMatchedDonations(donations || []);
      localStorage.setItem('matchedDonations', JSON.stringify(donations));

    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchPreviousDonations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          donor:profiles!donations_user_id_fkey (
            name,
            phone,
            address
          )
        `)
        .eq('organization_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPreviousDonations(data || []);
    } catch (error) {
      console.error('Error fetching previous donations:', error);
    }
  };

  const handleAcceptDonation = async (donationId, donorId) => {
    try {
      // Update donation status in database
      const { data: updatedDonation, error: donationError } = await supabase
        .from('donations')
        .update({ 
          status: 'accepted',
          organization_id: user.id 
        })
        .eq('id', donationId)
        .select(`
          *,
          donor:profiles!donations_user_id_fkey (
            name,
            phone,
            address
          )
        `)
        .single();

      if (donationError) throw donationError;

      // Remove the accepted donation from matched donations
      setMatchedDonations(prev => 
        prev.filter(donation => donation.id !== donationId)
      );

      // Add to previous donations immediately
      setPreviousDonations(prev => [updatedDonation, ...prev]);

      // Find and remove the request with matching quantity
      const matchedRequest = requests.find(req => req.quantity === updatedDonation.quantity);
      if (matchedRequest) {
        // Update request status in database
        await supabase
          .from('requests')
          .update({ status: 'matched' })
          .eq('id', matchedRequest.id);
        
        // Remove request from state
        setRequests(current => 
          current.filter(r => r.quantity !== updatedDonation.quantity)
        );

        // Clear lastRequestData if it was this request
        if (lastRequestData?.quantity === updatedDonation.quantity) {
          setLastRequestData(null);
          localStorage.removeItem('lastRequestData');
        }
      }

      // Clear matched donations from localStorage
      localStorage.removeItem('matchedDonations');

      // Close any expanded request
      setExpandedRequest(null);

    } catch (error) {
      console.error('Error accepting donation:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('requests')
        .insert([
          {
            user_id: user.id,
            quantity: parseInt(formData.quantity),
            description: formData.description,
            status: 'pending'
          }
        ])
        .select();

      if (error) throw error;

      setRequests(current => [...(data || []), ...current]);
      
      if (data && data.length > 0) {
        setLastRequestData(data[0]);
        localStorage.setItem('lastRequestData', JSON.stringify(data[0]));
      }
      
      // Fetch matches for all requests
      await fetchMatchesWithData();

      setFormData({
        quantity: '',
        description: ''
      });

    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleRequest = (requestId) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
  };

  const toggleDonor = (requestId, donorId) => {
    setExpandedDonors(prev => ({
      ...prev,
      [`${requestId}-${donorId}`]: !prev[`${requestId}-${donorId}`]
    }));
  };

  // Function to combine requests with same quantity
  const combineRequests = (requests, matchedDonations) => {
    const combinedRequests = {};
    
    requests.forEach(request => {
      const key = request.quantity;
      if (!combinedRequests[key]) {
        combinedRequests[key] = {
          quantity: request.quantity,
          requests: [request],
          donors: matchedDonations.filter(d => d.quantity === request.quantity)
        };
      } else {
        combinedRequests[key].requests.push(request);
        // No need to add donors again as they're already filtered by quantity
      }
    });

    return Object.values(combinedRequests);
  };

  return (
    <>
      <Header userType="organization" />
      <div className="organization-dashboard">
        <h1 className="organization-welcome">Welcome!</h1>
        {profile && (
          <div className="profile-info">
            <p>Welcome, {profile.name}!</p>
          </div>
        )}
        
        <div className="dashboard-content">
          <div className="left-column">
            <section className="request-form-section">
              <h2>Create New Food Request</h2>
              <form onSubmit={handleSubmit} className="request-form">
                <div className="form-group">
                  <label htmlFor="quantity">Quantity Needed (in kg)</label>
                  <input
                    id="quantity"
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your requirements..."
                    required
                    className="org-description"
                  />
                </div>

                <button type="submit" className="org-submit-btn">
                  Submit Request
                </button>
              </form>
            </section>

            <section className="previous-donations-section">
              <h2>Previous Donations Received</h2>
              <div className="previous-donations-list">
                {previousDonations.length > 0 ? (
                  <div className="previous-donations-table-container">
                    <table className="previous-donations-table">
                      <thead>
                        <tr>
                          <th>Donor Name</th>
                          <th>Contact</th>
                          <th>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previousDonations.map(donation => (
                          <tr key={donation.id}>
                            <td>{donation.donor?.name || 'N/A'}</td>
                            <td>{donation.donor?.phone || 'N/A'}</td>
                            <td>{donation.quantity} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-donations-message">
                    <p>No previous donor yet!</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="matches-section">
            <h2>Matches Found</h2>
            <div className="matches-content">
              {requests.length > 0 ? (
                combineRequests(requests, matchedDonations).map(combined => (
                  <div key={combined.quantity} className="request-item">
                    <div 
                      className="request-header"
                      onClick={() => toggleRequest(combined.quantity)}
                    >
                      <div className="request-title">
                        <span>Quantity: {combined.quantity} kg</span>
                        <span className="matching-count">
                          {combined.donors.length} matches
                        </span>
                      </div>
                      <FaChevronDown 
                        className={`expand-icon ${expandedRequest === combined.quantity ? 'rotated' : ''}`}
                      />
                    </div>
                    
                    <div className={`request-content ${expandedRequest === combined.quantity ? 'expanded' : ''}`}>
                      <div className="donor-list">
                        {combined.donors.map(donation => (
                          <div key={donation.id} className="donor-item">
                            <div className="donor-details">
                              <div className="donor-info">
                                <div className="info-row">
                                  <div className="info-item">
                                    <span className="info-label">Name</span>
                                    <span className="info-value">{donation.donor?.name}</span>
                                  </div>
                                  <div className="info-item">
                                    <span className="info-label">Phone</span>
                                    <span className="info-value">{donation.donor?.phone}</span>
                                  </div>
                                  <div className="info-item">
                                    <span className="info-label">City</span>
                                    <span className="info-value">{donation.donor?.city}</span>
                                  </div>
                                  <div className="info-item">
                                    <span className="info-label">Quantity</span>
                                    <span className="info-value">{donation.quantity} kg</span>
                                  </div>
                                </div>
                                <div className="info-row address">
                                  <div className="info-item">
                                    <span className="info-label">Address</span>
                                    <span className="info-value">{donation.donor?.address}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="donor-actions">
                                <div className="status-badge">
                                  Status: <span className={`status-${donation.status || 'pending'}`}>
                                    {donation.status || 'Pending'}
                                  </span>
                                </div>
                                {donation.status !== 'accepted' && (
                                  <button
                                    className="accept-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptDonation(donation.id, donation.donor?.id);
                                    }}
                                  >
                                    Accept Donation
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-matches">
                  <p>Send a request to get a donation</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default OrganizationDashboard;
