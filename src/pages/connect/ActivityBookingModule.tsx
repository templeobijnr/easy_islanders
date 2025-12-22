import React from 'react';
import type { DateRange } from 'react-day-picker';
import type { Activity } from '../../types/connect';
import PinBookingModule from './PinBookingModule';

interface ActivityBookingModuleProps {
  activity: Activity;
  onClose: () => void;
  onBook: (range: DateRange, guests: number, total: number, guestDetails: any) => void;
}

const ActivityBookingModule: React.FC<ActivityBookingModuleProps> = ({
  activity,
  onClose,
  onBook,
}) => {
  return (
    <PinBookingModule
      typeLabel="Activity"
      title={activity.title}
      subtitle={activity.category}
      categoryLabel={activity.category}
      images={activity.images}
      description={activity.description}
      coordinates={activity.coordinates}
      address={activity.address}
      price={activity.price}
      currency={activity.currency}
      pricingUnitLabel="/person"
      countLabel="Guests"
      businessId={activity.id}
      onClose={onClose}
      onBook={onBook}
    />
  );
};

export default ActivityBookingModule;

