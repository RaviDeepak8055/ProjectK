import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import supabase from '../../config/supabase';
import './Login.css';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userType = new URLSearchParams(location.search).get('type') || 'donor';
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState(''); // State for error messages

  const loginText = userType === 'donor' ? 'LOGIN AS DONOR' : 'LOGIN AS ORGANIZATION';

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Update form data
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error message when user starts typing
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation checks
    if (!formData.email) {
      setErrorMessage('Username is required');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Password is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrorMessage('Invalid email format');
      return;
    }

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        setErrorMessage('The email or password you entered is incorrect');
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to get user profile');
      }

      if (profile.user_type !== userType) {
        await supabase.auth.signOut();
        return;
      }

      navigate(userType === 'donor' ? '/donor/dashboard' : '/organization/dashboard');

    } catch (error) {
      console.error('Login error:', error);
      await supabase.auth.signOut();
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <span className="login">{loginText}</span>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="inputBox">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Email ID"
            />
            <span>Email</span>
          </div>

          <div className="inputBox">
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Password"
              />
              <button 
                type="button" 
                className="password-toggle password-toggle-login"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              <span>Password</span>
            </div>
          </div>

          <button type="submit" className="enter">
            Login
          </button>
        </form>

        {/* Display error message */}
        {errorMessage && <div className="popup-message">{errorMessage}</div>}

        <div className="signup-link">
          <span>Don't have an account?</span>
          <a href={`/signup?type=${userType}`}>Sign up</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
