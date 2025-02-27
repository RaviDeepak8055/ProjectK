import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaHome, FaLock, FaBuilding } from 'react-icons/fa';
import supabase from '../../config/supabase';
import './Signup.css';
import CustomSelect from './CustomSelect';

const Signup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userType = new URLSearchParams(location.search).get('type');

  // Separate state for password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    phone: '',
    ...(userType === 'organization' && {
      organizationType: ''
    })
  });

  const [passwordError, setPasswordError] = useState(''); // State for password error message
  const [popupMessage, setPopupMessage] = useState(''); // State for popup message

  const organizationType = [
    { value: 'rehabilitation-center', label: 'Rehabilitation Centre' },
    { value: 'old-age-home', label: 'Old Age Home' },
    { value: 'food-bank', label: 'Food Banks' },
    { value: 'orphanage', label: 'Orphanage' },
    { value: 'shelter', label: 'Shelters' }
  ];

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSymbols,
      message: password.length < minLength ? "Password must be at least 8 characters long" :
        !hasUpperCase ? "Password must include uppercase letters" :
        !hasLowerCase ? "Password must include lowercase letters" :
        !hasNumbers ? "Password must include numbers" :
        !hasSymbols ? "Password must include symbols" : ""
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Phone number validation
    if (name === 'phone') {
      const numbersOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData({
        ...formData,
        [name]: numbersOnly
      });
      return;
    }

    // Update form data
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear messages when user starts typing
    if (name === 'password' || name === 'confirmPassword') {
      setPasswordError('');
    }
    setPopupMessage(''); // Clear popup message when typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check for empty fields
    if (!formData.name) {
      setPopupMessage('Please fill out your name');
      return;
    }
    if (!formData.email) {
      setPopupMessage('Please fill out your email');
      return;
    }
    if (!formData.phone) {
      setPopupMessage('Please fill out your phone number');
      return;
    }
    if (!formData.address) {
      setPopupMessage('Please fill out your address');
      return;
    }
    if (!formData.city) {
      setPopupMessage('Please fill out your city');
      return;
    }
    if (!formData.password) {
      setPopupMessage('Please fill out your password');
      return;
    }
    if (!formData.confirmPassword) {
      setPopupMessage('Please confirm your password');
      return;
    }

    // Validate phone number length
    if (formData.phone.length !== 10) {
      setPasswordError("Phone number must be 10 digits long");
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.message);
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (userType === 'organization' && !formData.organizationType) {
      setPasswordError("Organization type is required");
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            user_type: userType
          }
        }
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Signup failed. Please try again.');
      }

      const profileData = {
        id: authData.user.id,
        name: formData.name,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        user_type: userType,
        ...(userType === 'organization' && {
          organization_type: formData.organizationType
        })
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error('Failed to create profile. Please try again.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      navigate(userType === 'donor' ? '/donor/dashboard' : '/organization/dashboard');

    } catch (error) {
      console.error('Signup error:', error);
      await supabase.auth.signOut();
    }
  };

  return (
    <div className="signup-container">
      <div className={`form_main ${userType === 'donor' ? 'donor-form' : 'org-form'}`}>
        <p className="heading">Sign Up as {userType === 'donor' ? 'Donor' : 'Organization'}</p>
        
        <form onSubmit={handleSubmit}>
          <div className="login__box">
            <input
              type="text"
              className="login__input"
              placeholder="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
            <FaUser />
          </div>

          <div className="login__box">
            <input
              type="email"
              className="login__input"
              placeholder="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            <FaEnvelope />
          </div>

          <div className="login__box">
            <input
              type="tel"
              className="login__input"
              placeholder="Phone (10 digits)"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              pattern="[0-9]{10}"
              maxLength="10"
              required
              autoComplete="tel"
            />
            <FaPhone />
          </div>

          <div className="login__box">
            <input
              type="text"
              className="login__input"
              placeholder="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              autoComplete="address-level2"
            />
            <FaMapMarkerAlt />
          </div>

          <div className="login__box">
            <input
              type="text"
              className="login__input"
              placeholder="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              autoComplete="address-line1"
            />
            <FaHome />
          </div>

          {userType === 'organization' && (
            <div className="login__box">
              <CustomSelect
                options={organizationType}
                value={formData.organizationType}
                onChange={handleChange}
                placeholder="Organization Type"
              />
            </div>
          )}

          <div className="login__box">
            <input
              type={showPassword ? "text" : "password"}
              className="login__input"
              placeholder="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
            <button 
              type="button"
              className={`password-toggle-${userType === 'donor' ? 'donor' : 'org'}`}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="login__box">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="login__input"
              placeholder="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
            <button 
              type="button"
              className={`password-toggle-${userType === 'donor' ? 'donor' : 'org'}-confirm`}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button type="submit" id="button">
            Sign Up
          </button>
        </form>
      </div>

      {/* Display popup message */}
      {popupMessage && <div className="popup-message">{popupMessage}</div>}
      {passwordError && <div className="error-message">{passwordError}</div>}
    </div>
  );
};

export default Signup;
