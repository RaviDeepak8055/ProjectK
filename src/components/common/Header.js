import React from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../config/supabase';
import logo from '../../assets/h2h-logo.png';
import './Header.css';

const Header = ({ userType }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-container">
          <img src={logo} alt="H2H Logo" className="logo" />
          <h1>HandToHand</h1>
        </div>
        <nav className="nav-links">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
