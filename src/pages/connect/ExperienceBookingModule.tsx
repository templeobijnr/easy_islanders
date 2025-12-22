import React from 'react';
import type { DateRange } from 'react-day-picker';
import type { Experience } from '../../types/connect';
import PinBookingModule from './PinBookingModule';

interface ExperienceBookingModuleProps {
  experience: Experience;
  onClose: () => void;
  onBook: (range: DateRange, guests: number, total: number, guestDetails: any) => void;
}

const ExperienceBookingModule: React.FC<ExperienceBookingModuleProps> = ({
  experience,
  onClose,
  onBook,
}) => {
  return (
    <PinBookingModule
      typeLabel="Experience"
      title={experience.title}
      subtitle={experience.category}
      categoryLabel={experience.category}
      durationLabel={experience.duration}
      images={experience.images}
      description={experience.description}
      coordinates={experience.coordinates}
      address={experience.address}
      price={experience.price}
      currency={experience.currency}
      pricingUnitLabel="/person"
      countLabel="Guests"
      businessId={experience.id}
      onClose={onClose}
      onBook={onBook}
    />
  );
};

export default ExperienceBookingModule;

