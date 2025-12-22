import React from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessOnboarding from './BusinessOnboarding';

const BusinessOnboardingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <BusinessOnboarding
      onComplete={() => navigate('/dashboard', { replace: true })}
      onExit={() => navigate('/', { replace: true })}
    />
  );
};

export default BusinessOnboardingPage;

