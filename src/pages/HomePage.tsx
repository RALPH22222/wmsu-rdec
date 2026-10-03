import React from 'react';
import { SubmissionPeriodPortal } from '../components/SubmissionPeriodPortal';

interface HomePageProps {
  onSignInClick?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSignInClick }) => {
  return <SubmissionPeriodPortal onSignInClick={onSignInClick} />;
};

export default HomePage;
