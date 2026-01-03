/**
 * HomePage
 * 
 * Main landing page component displaying hero, chat, featured content.
 * Extracted from App.tsx for proper routing.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/layout/Hero';
import AgentChatPanel from '../features/chat/components/AgentChatPanel';
import FeaturedStays from './home/FeaturedStays';
import LifestyleHighlights from './home/LifestyleHighlights';
import AboutSection from './home/AboutSection';
import FeaturedDestinations from './home/FeaturedDestinations';

export default function HomePage() {
    const navigate = useNavigate();

    const handleStartChat = () => {
        const agentSection = document.getElementById('agent');
        if (agentSection) {
            agentSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <main className="flex-grow">
            <Hero onStartChat={handleStartChat} onExplore={() => navigate('/explore')} />
            <AgentChatPanel variant="embedded" />
            <FeaturedStays onSeeAll={() => navigate('/explore')} />
            <LifestyleHighlights onSeeAll={() => navigate('/explore')} />
            <AboutSection />
            <FeaturedDestinations />
        </main>
    );
}
