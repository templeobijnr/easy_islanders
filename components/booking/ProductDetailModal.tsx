
import React, { useState } from 'react';
import { X, ShoppingBag, Truck, ShieldCheck, Star, Minus, Plus, Share, CreditCard, Check, AlertCircle } from 'lucide-react';
import { UnifiedItem } from '../../types';

interface ProductDetailModalProps {
  item: UnifiedItem;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ item: product, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product.imageUrl);
  const [step, setStep] = useState<'details' | 'checkout' | 'success'>('details');
  
  // Mock Checkout Data
  const [shippingInfo, setShippingInfo] = useState({ name: '', address: '', phone: '' });

  // Handle Buy
  const handleBuy = () => {
    setStep('checkout');
  };

  const handleConfirmOrder = () => {
    // Simulate API call
    setTimeout(() => {
       setStep('success');
    }, 1500);
  };

  const listing = product as any; // Type cast for accessing extra fields

  if (step === 'success') {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center relative z-10 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <Check size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed!</h2>
                <p className="text-slate-500 mb-6">Your order for <b>{listing.title}</b> has been placed. We'll notify you when it ships.</p>
                <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800">
                    Back to Marketplace
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl z-10 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[600px] animate-in zoom-in-95 duration-200 relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"><X size={20}/></button>

        {/* Left: Image Gallery */}
        <div className="w-full md:w-1/2 bg-slate-100 relative flex flex-col">
            <div className="flex-1 relative overflow-hidden">
                <img src={selectedImage} className="w-full h-full object-contain p-8 mix-blend-multiply" alt={listing.title} />
            </div>
            <div className="p-4 flex gap-2 justify-center overflow-x-auto">
                {[listing.imageUrl, ...(listing.images || [])].slice(0, 4).map((img: string, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => setSelectedImage(img)}
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden ${selectedImage === img ? 'border-teal-500' : 'border-transparent'}`}
                    >
                        <img src={img} className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>
        </div>

        {/* Right: Details */}
        <div className="w-full md:w-1/2 bg-white p-8 flex flex-col overflow-y-auto">
            {step === 'details' ? (
                <>
                    <div className="mb-auto">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-md">{listing.category || 'Product'}</span>
                            {listing.condition && <span className="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-bold uppercase rounded-md">{listing.condition}</span>}
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{listing.title}</h1>
                        <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold mb-6">
                            <Star size={16} className="fill-yellow-500" /> 4.8 (24 Reviews)
                        </div>
                        
                        <div className="text-3xl font-bold text-slate-900 mb-6">£{listing.price.toLocaleString()}</div>
                        
                        <p className="text-slate-600 leading-relaxed mb-8">{listing.description || "No description available."}</p>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <Truck size={18} className="text-teal-600" /> 
                                <span>Free delivery to <b>{listing.location}</b></span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <ShieldCheck size={18} className="text-teal-600" /> 
                                <span>Verified Seller • Money Back Guarantee</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center border border-slate-200 rounded-xl">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-slate-50 text-slate-500"><Minus size={16}/></button>
                                <span className="font-bold w-8 text-center">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="p-3 hover:bg-slate-50 text-slate-500"><Plus size={16}/></button>
                            </div>
                            <button onClick={handleBuy} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2 transition-all">
                                <ShoppingBag size={18} /> Buy Now
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="animate-in slide-in-from-right-4">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h2>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                            <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none" placeholder="John Doe" value={shippingInfo.name} onChange={e => setShippingInfo({...shippingInfo, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shipping Address</label>
                            <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none" placeholder="123 Main St, Kyrenia..." value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                            <input type="tel" className="w-full p-3 border border-slate-200 rounded-xl outline-none" placeholder="+90 533..." value={shippingInfo.phone} onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl mb-6">
                        <div className="flex justify-between mb-2 text-sm">
                            <span className="text-slate-500">Subtotal (x{quantity})</span>
                            <span className="font-bold">£{(listing.price * quantity).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between mb-2 text-sm">
                            <span className="text-slate-500">Shipping</span>
                            <span className="font-bold text-green-600">Free</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>£{(listing.price * quantity).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep('details')} className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50">Back</button>
                        <button onClick={handleConfirmOrder} className="flex-[2] py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg flex items-center justify-center gap-2">
                            <CreditCard size={18} /> Pay & Order
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
