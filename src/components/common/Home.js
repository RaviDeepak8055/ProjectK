import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import SnowEffect from './SnowEffect';

const Home = () => {
  return (
    <div className="home-container">
      <SnowEffect />
      <h1>HandToHand</h1>
      <h2>Connecting Those Who Give with Those in Need!</h2>
      
      <div className="main-buttons">
        <p className="tagline">Connecting Those Who Give with Those in Need!</p>
        <div className="button-group">
          <Link to="/login?type=donor" className="btn btn-primary">
            LOGIN AS DONOR
          </Link>
          <Link to="/login?type=organization" className="btn btn-primary">
            LOGIN AS ORGANIZATION
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
