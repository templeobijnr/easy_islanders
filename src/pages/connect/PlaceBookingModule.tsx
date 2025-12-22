import React from 'react';
import type { DateRange } from 'react-day-picker';
import type { Place } from '../../types/connect';
import PinBookingModule from './PinBookingModule';

interface PlaceBookingModuleProps {
  place: Place;
  onClose: () => void;
  onBook: (range: DateRange, guests: number, total: number, guestDetails: any) => void;
}

const PlaceBookingModule: React.FC<PlaceBookingModuleProps> = ({ place, onClose, onBook }) => {
  return (
    <PinBookingModule
      typeLabel="Trip"
      title={place.title}
      subtitle={place.category}
      categoryLabel={place.category}
      images={place.images}
      description={place.description}
      coordinates={place.coordinates}
      address={place.address}
      price={place.price}
      currency={place.currency}
      pricingUnitLabel="/trip"
      countLabel="Guests"
      businessId={place.id}
      onClose={onClose}
      onBook={onBook}
    />
  );
};

export default PlaceBookingModule;

