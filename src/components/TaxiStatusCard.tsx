/**
 * Taxi Status Card Component
 * Shows real-time taxi request status in the chat
 */
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';

interface TaxiRequest {
    id: string;
    status: 'pending' | 'assigned' | 'en_route' | 'completed' | 'cancelled';
    pickup: {
        address: string;
        location: {
            lat: number;
            lng: number;
            district: string;
        };
    };
    dropoff: {
        address: string;
    };
    assignedDriverId?: string;
    driverName?: string;
    driverPhone?: string;
    vehicleType?: string;
    rating?: number;
    createdAt: Date;
    assignedAt?: Date;
}

interface TaxiStatusCardProps {
    userId: string;
    requestId?: string; // If provided, track specific request
}

export const TaxiStatusCard: React.FC<TaxiStatusCardProps> = ({ userId, requestId }) => {
    const [request, setRequest] = useState<TaxiRequest | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        let unsubscribe: () => void;

        if (requestId) {
            // Track specific request
            unsubscribe = onSnapshot(
                doc(db, 'taxi_requests', requestId),
                (doc) => {
                    if (doc.exists()) {
                        setRequest({ id: doc.id, ...doc.data() } as TaxiRequest);
                    }
                    setLoading(false);
                },
                (error) => {
                    console.error('Error listening to taxi request:', error);
                    setLoading(false);
                }
            );
        } else {
            // Track latest active request for user
            const q = query(
                collection(db, 'taxi_requests'),
                where('userId', '==', userId),
                where('status', 'in', ['pending', 'assigned', 'en_route']),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    if (!snapshot.empty) {
                        const doc = snapshot.docs[0];
                        setRequest({ id: doc.id, ...doc.data() } as TaxiRequest);
                    } else {
                        setRequest(null);
                    }
                    setLoading(false);
                },
                (error) => {
                    console.error('Error listening to taxi requests:', error);
                    setLoading(false);
                }
            );
        }

        return () => unsubscribe();
    }, [userId, requestId]);

    if (loading) {
        return (
            <div className="taxi-status-card loading">
                <div className="spinner"></div>
                <p>Loading taxi status...</p>
            </div>
        );
    }

    if (!request) {
        return null; // No active request
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return '🔍';
            case 'assigned':
                return '✅';
            case 'en_route':
                return '🚗';
            case 'completed':
                return '🎉';
            case 'cancelled':
                return '❌';
            default:
                return '🚕';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Searching for driver...';
            case 'assigned':
                return 'Driver assigned!';
            case 'en_route':
                return 'Driver is on the way';
            case 'completed':
                return 'Trip completed';
            case 'cancelled':
                return 'Request cancelled';
            default:
                return 'Processing...';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return '#FFA500'; // Orange
            case 'assigned':
                return '#4CAF50'; // Green
            case 'en_route':
                return '#2196F3'; // Blue
            case 'completed':
                return '#9C27B0'; // Purple
            case 'cancelled':
                return '#F44336'; // Red
            default:
                return '#757575'; // Gray
        }
    };

    return (
        <div className="taxi-status-card" style={{ borderLeftColor: getStatusColor(request.status) }}>
            <div className="taxi-header">
                <span className="status-icon">{getStatusIcon(request.status)}</span>
                <div className="status-text">
                    <h4>{getStatusText(request.status)}</h4>
                    <p className="request-id">Request #{request.id.slice(-6).toUpperCase()}</p>
                </div>
            </div>

            <div className="taxi-details">
                <div className="location-info">
                    <div className="location-item">
                        <span className="icon">📍</span>
                        <div>
                            <p className="label">Pickup</p>
                            <p className="value">{request.pickup.address}</p>
                        </div>
                    </div>
                    <div className="location-item">
                        <span className="icon">🎯</span>
                        <div>
                            <p className="label">Destination</p>
                            <p className="value">{request.dropoff.address}</p>
                        </div>
                    </div>
                </div>

                {request.status === 'assigned' || request.status === 'en_route' ? (
                    <div className="driver-info">
                        <h5>Driver Information</h5>
                        <div className="driver-details">
                            <div className="driver-row">
                                <span className="icon">👤</span>
                                <span>{request.driverName || 'Unknown'}</span>
                            </div>
                            <div className="driver-row">
                                <span className="icon">🚗</span>
                                <span>{request.vehicleType || 'Unknown'}</span>
                            </div>
                            {request.rating && (
                                <div className="driver-row">
                                    <span className="icon">⭐</span>
                                    <span>{request.rating.toFixed(1)}/5.0</span>
                                </div>
                            )}
                            {request.driverPhone && (
                                <div className="driver-row">
                                    <span className="icon">📞</span>
                                    <a href={`tel:${request.driverPhone}`} className="phone-link">
                                        {request.driverPhone}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                ) : request.status === 'pending' ? (
                    <div className="pending-info">
                        <div className="pulse-animation">
                            <div className="pulse-circle"></div>
                            <div className="pulse-circle"></div>
                            <div className="pulse-circle"></div>
                        </div>
                        <p>Broadcasting to nearby drivers...</p>
                    </div>
                ) : null}
            </div>

            <style jsx>{`
                .taxi-status-card {
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    margin: 12px 0;
                    border-left: 4px solid;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .taxi-status-card.loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 32px;
                }

                .spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #2196F3;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 12px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .taxi-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .status-icon {
                    font-size: 32px;
                }

                .status-text h4 {
                    margin: 0 0 4px 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                }

                .request-id {
                    margin: 0;
                    font-size: 12px;
                    color: #666;
                    font-family: monospace;
                }

                .taxi-details {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .location-info {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .location-item {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }

                .location-item .icon {
                    font-size: 20px;
                    min-width: 24px;
                }

                .location-item .label {
                    margin: 0;
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                    font-weight: 500;
                }

                .location-item .value {
                    margin: 4px 0 0 0;
                    font-size: 14px;
                    color: #333;
                }

                .driver-info {
                    background: #f8f9fa;
                    padding: 12px;
                    border-radius: 8px;
                }

                .driver-info h5 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    color: #666;
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .driver-details {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .driver-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }

                .driver-row .icon {
                    font-size: 16px;
                    min-width: 20px;
                }

                .phone-link {
                    color: #2196F3;
                    text-decoration: none;
                }

                .phone-link:hover {
                    text-decoration: underline;
                }

                .pending-info {
                    text-align: center;
                    padding: 16px;
                }

                .pulse-animation {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }

                .pulse-circle {
                    width: 12px;
                    height: 12px;
                    background: #2196F3;
                    border-radius: 50%;
                    animation: pulse 1.5s ease-in-out infinite;
                }

                .pulse-circle:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .pulse-circle:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 0.3;
                        transform: scale(0.8);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                }

                .pending-info p {
                    margin: 0;
                    font-size: 14px;
                    color: #666;
                }
            `}</style>
        </div>
    );
};

export default TaxiStatusCard;
