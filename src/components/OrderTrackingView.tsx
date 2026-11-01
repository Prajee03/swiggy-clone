import React, { useMemo, useState } from 'react';
import type { AppScreen, OrderRecord } from '../types';
import { FoodImage } from './FoodImage';
import { VegBadge } from './VegBadge';

interface OrderTrackingViewProps {
  order: OrderRecord | null;
  onAdvanceOrderStep: (orderId: string) => Promise<void>;
  onAddRiderTip: (orderId: string, amount: number) => Promise<void>;
  onSendRiderMessage: (orderId: string, text: string) => Promise<void>;
  onNavigate: (screen: AppScreen) => void;
  onOpenOrderHistory: () => void;
  onShowToast: (msg: string) => void;
}

// Waypoints along Indiranagar 100ft Rd -> CMH Junction -> 12th Main Rd (SVG viewBox 0 0 600 320)
const ROUTE_WAYPOINTS: Array<[number, number]> = [
  [105, 238], // Restaurant: 100ft Rd HAL 2nd Stage
  [195, 224],
  [275, 195], // CMH Road intersection
  [355, 152],
  [425, 118],
  [495, 88],  // Home: 12th Main Rd Sunrise Apts
];

function interpolateRoutePosition(ratio: number): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, ratio));
  const totalSegments = ROUTE_WAYPOINTS.length - 1;
  const scaled = clamped * totalSegments;
  const index = Math.min(totalSegments - 1, Math.floor(scaled));
  const t = scaled - index;
  const [x1, y1] = ROUTE_WAYPOINTS[index];
  const [x2, y2] = ROUTE_WAYPOINTS[index + 1];
  return {
    x: x1 + (x2 - x1) * t,
    y: y1 + (y2 - y1) * t,
  };
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  order,
  onAdvanceOrderStep,
  onAddRiderTip,
  onSendRiderMessage,
  onNavigate,
  onOpenOrderHistory,
  onShowToast,
}) => {
  const [mapZoom, setMapZoom] = useState(1);
  const [mapOffset, setMapOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showTipBar, setShowTipBar] = useState(false);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(true);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLog, setSupportLog] = useState<Array<{ from: 'agent' | 'user'; text: string }>>([
    {
      from: 'agent',
      text: 'Hi! I am your Swiggy One Priority Support specialist. How can I assist you with this order?',
    },
  ]);

  const riderCoords = useMemo(
    () => interpolateRoutePosition(order?.rider.progressRatio ?? 0.55),
    [order?.rider.progressRatio],
  );

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center text-primary-container">
          <span className="material-symbols-outlined text-[32px]">two_wheeler</span>
        </div>
        <h2 className="font-display font-bold text-xl text-on-surface">
          No active order in transit
        </h2>
        <p className="text-sm text-on-surface-variant">
          Place an order from your favorite Bengaluru restaurant to track live GPS delivery here.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="px-6 py-3 rounded-xl bg-primary-container text-on-primary font-display font-bold text-sm"
        >
          Explore Food Near You
        </button>
      </div>
    );
  }

  const stepIndexMap = {
    confirmed: 0,
    prepared: 1,
    picked_up: 2,
    arriving: 3,
    delivered: 4,
  };
  const currentStepIdx = stepIndexMap[order.status];
  const progressPercent = Math.round(order.rider.progressRatio * 100);

  const handleSendChat = async (textToSend?: string) => {
    const msg = (textToSend ?? chatInput).trim();
    if (!msg) return;
    setChatInput('');
    await onSendRiderMessage(order.id, msg);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    const q = supportMessage.trim();
    setSupportMessage('');
    setSupportLog((prev) => [
      ...prev,
      { from: 'user', text: q },
      {
        from: 'agent',
        text: `Thanks for reaching out regarding Order #${order.orderNumber}. I have checked live telemetry with ${order.rider.name} — your thermal-sealed package is on schedule (${order.etaMinutes} mins remaining).`,
      },
    ]);
  };

  const fullPathD = ROUTE_WAYPOINTS.map(
    ([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x} ${y}`,
  ).join(' ');

  return (
    <div className="max-w-7xl mx-auto w-full pb-28 lg:pb-16">
      <div className="px-4 lg:px-6 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live ETA Banner + Interactive GPS Route Map + Rider Card */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Top Live ETA & Status Card */}
          <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-surface-container-high">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-primary-container font-bold">
                  {order.status === 'delivered' ? 'Delivered Safely' : 'Live GPS Tracking'}
                </span>
                <h2 className="font-display font-extrabold text-2xl text-on-surface mt-0.5 tabular-nums">
                  {order.status === 'delivered'
                    ? 'Order Delivered! Enjoy your meal'
                    : `Arriving in ${order.etaMinutes} mins`}
                </h2>
                <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-1 tabular-nums">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    verified
                  </span>
                  <span>
                    {order.status === 'delivered'
                      ? `Handed over at ${order.deliveryAddress.label}`
                      : `On-time guarantee · Expected by ${order.expectedByTime}`}
                  </span>
                </p>
              </div>

              {order.status !== 'delivered' ? (
                <button
                  type="button"
                  onClick={() => onAdvanceOrderStep(order.id)}
                  className="bg-surface-container-low hover:bg-surface-container px-3 py-2 rounded-xl flex items-center gap-1.5 text-on-surface text-xs font-bold shrink-0 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary-container">
                    fast_forward
                  </span>
                  <span>Next Stage</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenOrderHistory}
                    className="bg-primary-container text-on-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined material-symbols-filled text-[15px]">
                      star
                    </span>
                    <span>{order.rating ? 'View Rating' : 'Rate Order'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('home')}
                    className="bg-secondary text-on-secondary px-3.5 py-2 rounded-xl text-xs font-bold"
                  >
                    Order Again
                  </button>
                </div>
              )}
            </div>

            {/* Live Progress Bar */}
            <div className="w-full bg-surface-container rounded-full h-2 mt-4 overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full transition-transform duration-500 origin-left"
                style={{ transform: `scaleX(${Math.max(0.08, progressPercent / 100)})` }}
              />
            </div>
          </section>

          {/* Interactive Indiranagar GPS Vector Map */}
          <section className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden shadow-xs border border-surface-container-high bg-[#eef1f8] select-none">
            <svg
              viewBox="0 0 600 320"
              className="w-full h-full transition-transform duration-200"
              style={{
                transform: `scale(${mapZoom}) translate(${mapOffset.x}px, ${mapOffset.y}px)`,
              }}
              aria-label="Live delivery route map across Indiranagar, Bengaluru"
            >
              {/* Soft Urban Blocks & Parks */}
              <rect x="0" y="0" width="600" height="320" fill="#eef1f8" />
              <rect x="30" y="30" width="140" height="95" rx="12" fill="#dcefe2" />
              <text x="50" y="80" fill="#2d6a4f" fontSize="10" fontWeight="600" opacity="0.8">
                Defence Colony Park
              </text>
              <rect x="380" y="185" width="175" height="95" rx="14" fill="#dcefe2" />
              <text x="415" y="236" fill="#2d6a4f" fontSize="10" fontWeight="600" opacity="0.8">
                HAL 2nd Stage Green
              </text>

              {/* City Blocks */}
              <rect x="200" y="35" width="150" height="80" rx="8" fill="#e3e7f3" />
              <rect x="45" y="155" width="120" height="125" rx="8" fill="#e3e7f3" />
              <rect x="210" y="215" width="135" height="75" rx="8" fill="#e3e7f3" />

              {/* Secondary Arterial Streets */}
              <g stroke="#ffffff" strokeWidth="10" strokeLinecap="round" fill="none">
                <path d="M 0 140 L 600 140" />
                <path d="M 185 0 L 185 320" />
                <path d="M 365 0 L 365 320" />
                <path d="M 40 265 L 570 65" />
              </g>

              {/* Major Road Labels */}
              <text x="205" y="135" fill="#6e7485" fontSize="9" fontWeight="700">
                CMH ROAD
              </text>
              <text
                x="178"
                y="68"
                fill="#6e7485"
                fontSize="9"
                fontWeight="700"
                transform="rotate(-90 178 68)"
              >
                100 FEET ROAD
              </text>
              <text
                x="358"
                y="82"
                fill="#6e7485"
                fontSize="9"
                fontWeight="700"
                transform="rotate(-90 358 82)"
              >
                12TH MAIN ROAD
              </text>

              {/* Planned Route Dashed Line */}
              <path
                d={fullPathD}
                fill="none"
                stroke="#fc8019"
                strokeWidth="5"
                strokeDasharray="8 6"
                strokeLinecap="round"
                opacity="0.45"
              />

              {/* Active Rider Line Segment */}
              <line
                x1={ROUTE_WAYPOINTS[0][0]}
                y1={ROUTE_WAYPOINTS[0][1]}
                x2={riderCoords.x}
                y2={riderCoords.y}
                stroke="#fc8019"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Origin Restaurant Node */}
              <g transform={`translate(${ROUTE_WAYPOINTS[0][0]}, ${ROUTE_WAYPOINTS[0][1]})`}>
                <circle r="11" fill="#1d6d00" />
                <circle r="5" fill="#ffffff" />
              </g>

              {/* Destination Home Node */}
              <g transform={`translate(${ROUTE_WAYPOINTS[5][0]}, ${ROUTE_WAYPOINTS[5][1]})`}>
                <circle r="13" fill="#984800" />
                <circle r="5" fill="#ffffff" />
              </g>

              {/* Live Moving Scooter Marker */}
              <g transform={`translate(${riderCoords.x}, ${riderCoords.y})`}>
                <circle r="22" fill="#fc8019" opacity="0.2" />
                <circle r="15" fill="#fc8019" stroke="#ffffff" strokeWidth="3" />
                <circle r="4" fill="#ffffff" />
              </g>
            </svg>

            {/* Restaurant Floating Info Card */}
            <div className="absolute top-3 left-3 bg-surface-container-lowest/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs border border-surface-container-high flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-secondary">
                storefront
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-on-surface leading-tight">
                  {order.restaurantName}
                </span>
                <span className="text-[10px] text-on-surface-variant tabular-nums">
                  Picked up · {order.timestamps.picked_up}
                </span>
              </div>
            </div>

            {/* Destination Floating Info Card */}
            <div className="absolute top-3 right-3 bg-surface-container-lowest/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs border border-surface-container-high flex items-center gap-2">
              <span className="material-symbols-outlined material-symbols-filled text-[16px] text-primary-container">
                home
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-on-surface leading-tight">
                  {order.deliveryAddress.label}
                </span>
                <span className="text-[10px] text-on-surface-variant max-w-[130px] truncate">
                  {order.deliveryAddress.shortArea}
                </span>
              </div>
            </div>

            {/* Rider Live Distance Tag */}
            <div className="absolute bottom-3 left-3 bg-inverse-surface/90 backdrop-blur-md text-inverse-on-surface text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-2 tabular-nums">
              <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">
                two_wheeler
              </span>
              <span>
                {order.status === 'delivered'
                  ? `${order.rider.name} arrived at doorstep`
                  : `${order.rider.name.split(' ')[0]} is ${order.rider.distanceAwayKm} km away`}
              </span>
            </div>

            {/* Map Pan / Zoom / Recenter Controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Zoom out map"
                onClick={() => setMapZoom((z) => Math.max(0.85, Number((z - 0.15).toFixed(2))))}
                className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <button
                type="button"
                aria-label="Zoom in map"
                onClick={() => setMapZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
                className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
              <button
                type="button"
                aria-label="Center on rider"
                onClick={() => {
                  setMapZoom(1);
                  setMapOffset({ x: 0, y: 0 });
                  onShowToast(`Centered GPS view on ${order.rider.name}`);
                }}
                className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center text-primary-container hover:bg-surface-container-low active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[19px]">my_location</span>
              </button>
            </div>
          </section>

          {/* Delivery Partner Card */}
          <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-surface-container-high">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative w-13 h-13 shrink-0">
                  <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs">
                    <FoodImage
                      src={order.rider.avatar}
                      alt={order.rider.name}
                      fallbackIcon="two_wheeler"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 bg-secondary text-on-secondary rounded-full p-0.5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-on-surface">
                      {order.rider.name}
                    </h3>
                    <span className="text-[11px] text-on-surface-variant">· Vaccinated Partner</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs tabular-nums">
                    <span className="inline-flex items-center gap-0.5 text-secondary font-bold">
                      {order.rider.rating}
                      <span className="material-symbols-outlined material-symbols-filled text-[13px]">
                        star
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-outline-variant">·</span>
                    <span className="text-on-surface-variant">
                      {order.rider.deliveriesCount} deliveries
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2.5 mt-4 bg-surface-container-low/70 p-2 rounded-xl">
              <button
                type="button"
                onClick={() => setShowCallSheet(true)}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high active:scale-95 transition-all text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  call
                </span>
                <span className="text-xs mt-1 font-semibold">Call</span>
              </button>

              <button
                type="button"
                onClick={() => setShowChatModal(true)}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high active:scale-95 transition-all text-on-surface relative"
              >
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  chat
                </span>
                <span className="text-xs mt-1 font-semibold">
                  Chat ({order.chatMessages.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowTipBar((v) => !v)}
                className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high active:scale-95 transition-all text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px] text-secondary">
                  volunteer_activism
                </span>
                <span className="text-xs mt-1 font-semibold tabular-nums">
                  Tip {order.tipAmount > 0 ? `(₹${order.tipAmount})` : 'Rider'}
                </span>
              </button>
            </div>

            {/* Expandable Tip Bar */}
            {showTipBar && (
              <div className="mt-3 pt-3 border-t border-surface-container-high">
                <p className="text-xs text-on-surface-variant mb-2">
                  Add an appreciation tip for {order.rider.name} (100% transferred to rider)
                </p>
                <div className="flex items-center gap-2 tabular-nums">
                  {[20, 30, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={async () => {
                        await onAddRiderTip(order.id, amt);
                        setShowTipBar(false);
                      }}
                      className="flex-1 py-2 rounded-xl bg-surface-container-low hover:bg-primary-container hover:text-on-primary text-xs font-bold transition-colors"
                    >
                      + ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Live Timeline + Order Details Accordion + Support */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Live Order Timeline */}
          <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-surface-container-high">
            <h3 className="font-display font-bold text-base text-on-surface mb-4">
              Order Progress
            </h3>

            <div className="relative pl-7 space-y-6">
              <div className="absolute left-2.5 top-2.5 bottom-3 w-0.5 bg-surface-container-high" />

              {[
                {
                  idx: 0,
                  title: 'Order Confirmed',
                  desc: `${order.restaurantName} accepted your order`,
                  time: order.timestamps.confirmed,
                },
                {
                  idx: 1,
                  title: 'Food Prepared & Sealed',
                  desc: `Packed hygienically at ${order.restaurantName}`,
                  time: order.timestamps.prepared,
                },
                {
                  idx: 2,
                  title: 'Order on the way',
                  desc: `${order.rider.name} picked up your order`,
                  time: order.timestamps.picked_up,
                },
                {
                  idx: 3,
                  title:
                    order.status === 'delivered'
                      ? 'Delivered at your doorstep'
                      : 'Arriving at your doorstep',
                  desc:
                    order.deliveryInstructions.length > 0
                      ? `Instructions: ${order.deliveryInstructions.join(', ')}`
                      : 'Keep phone handy for seamless delivery',
                  time: order.timestamps.arriving,
                },
              ].map((step) => {
                const isCompleted = currentStepIdx > step.idx || order.status === 'delivered';
                const isCurrent =
                  currentStepIdx === step.idx && order.status !== 'delivered';

                return (
                  <div
                    key={step.title}
                    className={`relative flex items-start gap-3 ${
                      !isCompleted && !isCurrent ? 'opacity-55' : ''
                    }`}
                  >
                    <div
                      className={`absolute -left-7 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-secondary text-on-secondary'
                          : isCurrent
                            ? 'bg-primary-container text-on-primary ring-4 ring-primary-fixed'
                            : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-[13px] font-bold">
                          check
                        </span>
                      ) : isCurrent ? (
                        <span className="material-symbols-outlined text-[13px]">
                          local_shipping
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-outline-variant" />
                      )}
                    </div>

                    <div className="flex-1 flex justify-between items-baseline gap-2">
                      <div>
                        <p
                          className={`text-xs sm:text-sm font-bold ${
                            isCurrent ? 'text-primary-container' : 'text-on-surface'
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{step.desc}</p>
                      </div>
                      <span className="text-xs text-on-surface-variant shrink-0 tabular-nums">
                        {step.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Order Details Accordion */}
          <section className="bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
            <button
              type="button"
              onClick={() => setIsOrderDrawerOpen((v) => !v)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container shrink-0">
                  <span className="material-symbols-outlined text-[22px]">restaurant</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-display font-bold text-base text-on-surface truncate">
                    {order.restaurantName}
                  </h4>
                  <p className="text-xs text-on-surface-variant tabular-nums">
                    Order #{order.orderNumber} ·{' '}
                    {order.items.reduce((sum, i) => sum + i.qty, 0)} items
                  </p>
                </div>
              </div>
              <span
                className={`material-symbols-outlined text-[22px] text-on-surface-variant transition-transform ${
                  isOrderDrawerOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {isOrderDrawerOpen && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 tabular-nums">
                <div className="bg-surface-container-low p-3.5 rounded-xl space-y-2.5">
                  {order.items.map((item) => (
                    <div key={item.cartKey} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <VegBadge diet={item.diet} size="sm" />
                        <span className="text-xs sm:text-sm text-on-surface truncate">
                          {item.qty} × {item.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-on-surface shrink-0">
                        ₹{(item.unitPrice * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-surface-container-high/80 text-xs text-on-surface-variant flex justify-between">
                    <span>Taxes, Platform Fee & Tip</span>
                    <span>
                      ₹
                      {(
                        order.gstAndCharges +
                        order.platformFee +
                        order.deliveryFee +
                        order.tipAmount
                      ).toFixed(2)}
                    </span>
                  </div>

                  {order.couponDiscount > 0 && (
                    <div className="text-xs text-secondary font-semibold flex justify-between">
                      <span>Coupon Savings ({order.couponCode})</span>
                      <span>− ₹{order.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">
                        check_circle
                      </span>
                      <span className="text-xs font-semibold text-on-surface">
                        Paid via {order.paymentMethod}
                      </span>
                    </div>
                    <span className="font-display font-bold text-base text-on-surface">
                      ₹{order.totalPaid.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(true)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    <span>View Tax Receipt</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 24/7 Support Card */}
          <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-surface-container-high flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface shrink-0">
                <span className="material-symbols-outlined text-[20px]">support_agent</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface">Need help with this order?</h4>
                <p className="text-xs text-on-surface-variant">
                  24/7 Swiggy One live specialist support
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl shrink-0 transition-colors"
            >
              Chat Now
            </button>
          </section>
        </div>
      </div>

      {/* In-App Rider Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[82vh]">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden">
                  <FoodImage src={order.rider.avatar} alt={order.rider.name} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-on-surface">
                    {order.rider.name}
                  </h3>
                  <p className="text-[11px] text-secondary font-semibold">
                    Active on delivery · {order.rider.distanceAwayKm} km away
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {order.chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-primary-container text-on-primary rounded-br-xs'
                        : 'bg-surface-container-low text-on-surface rounded-bl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-on-surface-variant mt-1 px-1 tabular-nums">
                    {m.timestamp}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Reply Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2.5">
              {[
                'Where have you reached?',
                'Leave order with security',
                'Avoid ringing the doorbell',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendChat(chip)}
                  className="px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface whitespace-nowrap shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex gap-2 pt-2 border-t border-surface-container-high"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Message ${order.rider.name}...`}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Masked Voice Call Sheet */}
      {showCallSheet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-inverse-surface text-inverse-on-surface w-full max-w-xs rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto ring-4 ring-primary-container/40">
              <FoodImage src={order.rider.avatar} alt={order.rider.name} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-primary-fixed-dim font-bold">
                Privacy Masked Bridge
              </p>
              <h3 className="font-display font-bold text-lg mt-0.5">{order.rider.name}</h3>
              <p className="text-xs opacity-75 tabular-nums mt-0.5">{order.rider.phoneMasked}</p>
            </div>
            <p className="text-xs bg-white/10 rounded-xl py-2 px-3">
              Ringing delivery partner via Swiggy safe relay...
            </p>
            <button
              type="button"
              onClick={() => setShowCallSheet(false)}
              className="w-full py-3 rounded-xl bg-error text-on-error font-display font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">call_end</span>
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}

      {/* Tax Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 tabular-nums">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-on-surface">
                  Tax Invoice · #{order.orderNumber}
                </h3>
                <p className="text-xs text-on-surface-variant">{order.restaurantName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {order.items.map((i) => (
                <div key={i.cartKey} className="flex justify-between">
                  <span>
                    {i.qty} × {i.name}
                  </span>
                  <span className="font-semibold">₹{(i.unitPrice * i.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="h-px bg-surface-container-high my-2" />
              <div className="flex justify-between text-on-surface-variant">
                <span>Item Subtotal</span>
                <span>₹{order.itemTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>GST & Packaging</span>
                <span>₹{order.gstAndCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Platform & Delivery</span>
                <span>₹{(order.platformFee + order.deliveryFee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Delivery Partner Tip</span>
                <span>₹{order.tipAmount.toFixed(2)}</span>
              </div>
              {order.couponDiscount > 0 && (
                <div className="flex justify-between text-secondary font-semibold">
                  <span>Discount ({order.couponCode})</span>
                  <span>− ₹{order.couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-surface-container-high my-2" />
              <div className="flex justify-between font-display font-bold text-sm text-on-surface">
                <span>Total Paid ({order.paymentMethod})</span>
                <span>₹{order.totalPaid.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              className="w-full py-2.5 rounded-xl bg-inverse-surface text-inverse-on-surface text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print / Save PDF Invoice</span>
            </button>
          </div>
        </div>
      )}

      {/* 24/7 Support Specialist Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-on-surface">
                  24/7 Order Support
                </h3>
                <p className="text-xs text-on-surface-variant">Order #{order.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto py-2">
              {supportLog.map((entry, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    entry.from === 'user'
                      ? 'bg-primary-container text-on-primary ml-8'
                      : 'bg-surface-container-low text-on-surface mr-8'
                  }`}
                >
                  {entry.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSupportSubmit} className="flex gap-2">
              <input
                type="text"
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Describe any question about your order..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
