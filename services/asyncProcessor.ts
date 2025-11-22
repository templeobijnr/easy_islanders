
import { StorageService } from './storageService';
import { Booking, UserNotification } from '../types';
import { MOCK_HOT_ZONES } from '../constants';

class AsyncProcessorService {
  private intervalIds: NodeJS.Timeout[] = [];
  private isRunning = false;

  init() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("🔄 Async Processor Started (Simulating Backend Workers)");

    // 1. Booking Pipeline Worker (Runs every 5s)
    this.intervalIds.push(setInterval(this.processBookingQueue, 5000));

    // 2. Vibe Map Decay Worker (Runs every 30s)
    this.intervalIds.push(setInterval(this.processVibeDynamics, 30000));

    // 3. Social Activity Simulator (Runs every 45s)
    this.intervalIds.push(setInterval(this.simulateSocialActivity, 45000));
  }

  stop() {
    this.intervalIds.forEach(clearInterval);
    this.isRunning = false;
  }

  // --- TASK: Booking State Machine ---
  // Simulates Payment Gateway Webhooks and Agent Approvals
  private processBookingQueue = async () => {
    const bookings = await StorageService.getUserBookings();
    let hasChanges = false;

    for (const booking of bookings) {
      // Scenario A: Payment Pending -> Confirmed (Simulate Stripe Success)
      if (booking.status === 'payment_pending') {
        // Simulate random processing time check (mock logic based on ID hash)
        if (Math.random() > 0.3) { 
          booking.status = 'confirmed';
          await StorageService.saveBooking(booking);
          this.sendNotification(booking.id, 'Booking Confirmed', `Your booking for ${booking.itemTitle} is confirmed! Check your email for the receipt.`, 'booking');
          hasChanges = true;
        }
      }

      // Scenario B: Viewing Requested -> Viewing Confirmed (Simulate Agent Approval)
      if (booking.status === 'viewing_requested') {
        // Simulate agent "seeing" it after a delay
        if (Math.random() > 0.5) {
          booking.status = 'viewing_confirmed';
          await StorageService.saveBooking(booking);
          this.sendNotification(booking.id, 'Viewing Approved', `Good news! The owner has confirmed your viewing for ${booking.itemTitle}.`, 'booking');
          hasChanges = true;
        }
      }

      // Scenario C: Taxi Dispatched -> Driver Arrived
      if (booking.status === 'taxi_dispatched') {
         // Simulate arrival
         if (Math.random() > 0.7) {
            // Just send a notification, don't change status to 'completed' yet to keep the card visible for demo
            this.sendNotification(booking.id, 'Driver Arriving', `Your driver ${booking.driverDetails?.name} is 1 minute away.`, 'system');
         }
      }
    }
    
    if (hasChanges) {
       console.log("🔄 [AsyncProcessor] Processed Booking Queue updates.");
    }
  };

  // --- TASK: Vibe Map Dynamics ---
  // Simulates people moving around the island
  private processVibeDynamics = async () => {
     // We can't easily update the constants file, but we can simulate notifications about trends
     const randomZone = MOCK_HOT_ZONES[Math.floor(Math.random() * MOCK_HOT_ZONES.length)];
     if (Math.random() > 0.7) {
        this.sendNotification('trend-' + Date.now(), 'Trending Nearby', `${randomZone.name} is getting busy! ${randomZone.activeCount + 5} islanders are there right now.`, 'social');
     }
  };

  // --- TASK: Social Simulation ---
  private simulateSocialActivity = async () => {
     // Simulate a like or comment on user's post
     const posts = await StorageService.getSocialPosts();
     const myPosts = posts.filter(p => p.author.id === 'me');
     
     if (myPosts.length > 0 && Math.random() > 0.6) {
        const post = myPosts[0];
        post.likes += 1;
        await StorageService.saveSocialPost(post);
        this.sendNotification('like-' + Date.now(), 'New Vouch', `Someone vouched for your post about ${post.location || 'island life'}.`, 'social');
     }
  };

  // Helper to push notification
  private sendNotification(id: string, title: string, message: string, type: 'booking' | 'social' | 'system' | 'promotion') {
     const notif: UserNotification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        userId: 'me',
        type,
        title,
        message,
        read: false,
        timestamp: new Date().toISOString()
     };
     StorageService.saveNotification(notif);
  }
}

export const AsyncProcessor = new AsyncProcessorService();
