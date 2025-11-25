import React from 'react';
import MapboxIslandMap from './MapboxIslandMap';
import { SocialUser } from '../../types';

interface IslandMapProps {
   currentUser: SocialUser;
}

const IslandMap: React.FC<IslandMapProps> = ({ currentUser }) => {
   return <MapboxIslandMap currentUser={currentUser} />;
};

export default IslandMap;
