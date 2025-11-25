# Driver Rewards Program

## Overview
Incentivize reliable taxi drivers with a tiered reward system based on performance metrics.

## Performance Metrics

### 1. Acceptance Rate
- **Formula**: (Accepted Requests / Total Requests Sent) × 100%
- **Target**: >80%

### 2. Response Time
- **Measurement**: Average time to reply "YES"
- **Target**: <2 minutes

### 3. Completion Rate
- **Formula**: (Completed Rides / Accepted Rides) × 100%
- **Target**: >95%

### 4. Customer Rating
- **Scale**: 1-5 stars
- **Target**: >4.5

## Reward Tiers

### 🥉 Bronze (Starting Level)
- **Requirements**: New driver
- **Benefits**:
  - Access to dispatch system
  - Basic support

### 🥈 Silver (30 rides, 80% acceptance, 4.0+ rating)
- **Benefits**:
  - Priority in broadcast (top 50%)
  - 5% bonus on platform fees
  - Monthly performance report

### 🥇 Gold (100 rides, 85% acceptance, 4.5+ rating)
- **Benefits**:
  - **First-tier priority** in broadcast
  - 10% bonus on platform fees
  - Access to premium ride requests
  - Quarterly bonus payment
  - Featured in "Top Drivers" list

### 💎 Platinum (500 rides, 90% acceptance, 4.8+ rating)
- **Benefits**:
  - **Exclusive first broadcast** (5-second head start)
  - 15% bonus on platform fees
  - Annual appreciation bonus
  - Exclusive Platinum badge on profile
  - VIP support line

## Monthly Bonuses

### Volume Bonuses
- 50-99 rides: +5% bonus
- 100-199 rides: +10% bonus
- 200+ rides: +15% bonus

### Streak Bonuses
- 7 days with >80% acceptance: 500 TL bonus
- 30 days with >85% acceptance: 2,000 TL bonus

## Penalties

### Warning System
- Acceptance rate <60%: Warning
- 3 consecutive no-shows: 7-day suspension
- Customer rating <3.5: Review and training

### Suspension
- Repeated violations
- Fraudulent activity
- Customer complaints

## How to Track Performance

Drivers can view their stats via:
1. Monthly WhatsApp report
2. Admin panel (coming soon)
3. Request from operations team

## Implementation Notes

### Firestore Schema Extension

Add these fields to `taxi_drivers` collection:
```typescript
{
  ...existingFields,
  performanceMetrics: {
    totalRequests: number,
    acceptedRequests: number,
    completedRides: number,
    averageResponseTime: number, // seconds
    rating: number,
    totalRatings: number
  },
  tier: 'bronze' | 'silver' | 'gold' | 'platinum',
  monthlyStats: {
    ridesThisMonth: number,
    bonusEarned: number,
    currentStreak: number
  }
}
```

### Automated Tier Calculation

Run monthly via Cloud Scheduler:
```typescript
async function updateDriverTiers() {
  const drivers = await db.collection('taxi_drivers').get();
  
  for (const doc of drivers.docs) {
    const data = doc.data();
    const metrics = data.performanceMetrics;
    
    // Calculate tier
    const acceptanceRate = (metrics.acceptedRequests / metrics.totalRequests) * 100;
    let tier = 'bronze';
    
    if (metrics.completedRides >= 500 && acceptanceRate >= 90 && metrics.rating >= 4.8) {
      tier = 'platinum';
    } else if (metrics.completedRides >= 100 && acceptanceRate >= 85 && metrics.rating >= 4.5) {
      tier = 'gold';
    } else if (metrics.completedRides >= 30 && acceptanceRate >= 80 && metrics.rating >= 4.0) {
      tier = 'silver';
    }
    
    await doc.ref.update({ tier });
  }
}
```

## Future Enhancements

1. **Referral Bonuses**: Earn bonuses for bringing new drivers
2. **Peak Hour Multipliers**: Extra pay during high-demand times
3. **Loyalty Program**: Long-term driver retention bonuses
4. **Driver Leaderboard**: Gamification and recognition
