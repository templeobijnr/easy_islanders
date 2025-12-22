import React from 'react';
import type { DateRange } from 'react-day-picker';
import type { Event } from '../../types/connect';
import PinBookingModule from './PinBookingModule';

interface EventBookingModuleProps {
  event: Event;
  onClose: () => void;
  onBook: (range: DateRange, tickets: number, total: number, guestDetails: any) => void;
}

const toDate = (value: any): Date => {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  return new Date();
};

const EventBookingModule: React.FC<EventBookingModuleProps> = ({ event, onClose, onBook }) => {
  const start = toDate(event.startTime);

  return (
    <PinBookingModule
      typeLabel="Event"
      title={event.title}
      subtitle={event.category}
      categoryLabel={event.category}
      images={event.images}
      description={event.description}
      coordinates={event.coordinates}
      address={event.address}
      price={event.price}
      currency={event.currency}
      pricingUnitLabel="/ticket"
      countLabel="Tickets"
      fixedDate={start}
      onClose={onClose}
      onBook={onBook}
    />
  );
};

export default EventBookingModule;

