import React from 'react';
import MapboxIslandMap from './MapboxIslandMap';
import { SocialUser } from '../../types';
import { FeedItem } from '../../types/connect';

interface IslandMapProps {
   currentUser: SocialUser;
   places?: FeedItem[];
}

const IslandMap: React.FC<IslandMapProps> = ({ currentUser, places }) => {
   return <MapboxIslandMap currentUser={currentUser} places={places} />;
};

export default IslandMap;
