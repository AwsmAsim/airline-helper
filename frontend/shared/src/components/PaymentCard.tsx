import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, Loader2, Luggage, UtensilsCrossed, Armchair, ShieldCheck } from 'lucide-react';
import type { ServiceActionData, AirlineConfig } from '../types';

interface Props {
  data: ServiceActionData;
  config: AirlineConfig;
}

type Stage = 'loading' | 'payment' | 'confirming' | 'confirmed';

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  excess_baggage: <Luggage size={14} color="white" />,
  meal: <UtensilsCrossed size={14} color="white" />,
  seat_upgrade: <Armchair size={14} color="white" />,
  zero_cancellation: <ShieldCheck size={14} color="white" />,
};

const LOADING_STEPS = [
  'Preparing your add-on…',
  'Securing payment link…',
  'Almost ready…',
];

const CONFIRMING_STEPS = [
  'Processing payment…',
  'Updating your booking…',
  'Sending confirmation…',
];

export function PaymentCard({ data, config }: Props) {
  const [stage, setStage] = useState<Stage>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Initial load → show payment card after ~2s
  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 600);
    const doneTimer = setTimeout(() => setStage('payment'), 2000);
    return () => { clearInterval(stepTimer); clearTimeout(doneTimer); };
  }, []);

  // After confirming, show confirmed state
  useEffect(() => {
    if (stage !== 'confirming') return;
    setStepIndex(0);
    const stepTimer = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, CONFIRMING_STEPS.length - 1));
    }, 700);
    const doneTimer = setTimeout(() => setStage('confirmed'), 2500);
    return () => { clearInterval(stepTimer); clearTimeout(doneTimer); };
  }, [stage]);

  const handlePayClick = () => setShowModal(true);
  const handleModalOk = () => {
    setShowModal(false);
    setStage('confirming');
  };

  const icon = SERVICE_ICONS[data.service_type] ?? <CreditCard size={14} color="white" />;

  return (
    <>
      <div className="flex items-start gap-2.5 px-4 mb-3">
        {/* Airline avatar */}
        <div
          className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm overflow-hidden border"
          style={{ borderColor: `${config.primary}20` }}
        >
          <img src={config.logoUrl} alt={config.name} className="w-5 h-5 object-contain" />
        </div>

        <div className="max-w-[84%]">
          {/* Loading state */}
          {(stage === 'loading') && (
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3 min-w-[220px]">
              <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: config.primary }} />
              <span className="text-sm text-gray-500 italic">{LOADING_STEPS[stepIndex]}</span>
            </div>
          )}

          {/* Payment card */}
          {stage === 'payment' && (
            <div
              className="rounded-2xl rounded-tl-sm shadow-sm border overflow-hidden min-w-[260px]"
              style={{ borderColor: `${config.primary}30` }}
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${config.primary}12` }}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: config.primary }}
                >
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: config.primaryDark }}>
                    Add {data.description}
                  </p>
                  <p className="text-xs text-gray-400">Booking add-on</p>
                </div>
              </div>

              {/* Details */}
              <div className="bg-white px-4 py-3 space-y-2">
                <Row label="Passenger" value={data.passenger_name} />
                <Row label="Flight" value={data.flight} mono />
                <Row label="Service" value={data.description} />
                <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total amount</span>
                  <span className="text-base font-bold" style={{ color: config.primary }}>
                    ₹{data.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Pay button */}
              <div className="px-4 py-3 bg-gray-50">
                <button
                  onClick={handlePayClick}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75 flex items-center justify-center gap-2"
                  style={{ background: config.primary }}
                >
                  <CreditCard size={15} />
                  Pay ₹{data.amount.toLocaleString('en-IN')}
                </button>
              </div>
            </div>
          )}

          {/* Confirming state */}
          {stage === 'confirming' && (
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3 min-w-[220px]">
              <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: config.primary }} />
              <span className="text-sm text-gray-500 italic">{CONFIRMING_STEPS[stepIndex]}</span>
            </div>
          )}

          {/* Confirmed card */}
          {stage === 'confirmed' && (
            <div
              className="rounded-2xl rounded-tl-sm shadow-sm border overflow-hidden min-w-[260px]"
              style={{ borderColor: '#05966930' }}
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#05966912' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#059669' }}>
                  <CheckCircle size={14} color="white" />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#059669' }}>
                    {data.description} Added!
                  </p>
                  <p className="text-xs text-gray-400 font-mono">{data.action_id}</p>
                </div>
                <CheckCircle size={16} className="ml-auto" style={{ color: '#059669' }} />
              </div>

              <div className="bg-white px-4 py-3 space-y-2">
                <Row label="Passenger" value={data.passenger_name} />
                <Row label="Flight" value={data.flight} mono />
                <Row label="Added" value={data.description} />
                <Row label="Paid" value={`₹${data.amount.toLocaleString('en-IN')}`} />
              </div>

              <div className="px-4 py-2 text-xs" style={{ background: '#05966908', color: '#059669' }}>
                ✅ Booking updated · Confirmation sent to your email
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mock payment modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${config.primary}15` }}
              >
                <CreditCard size={20} style={{ color: config.primary }} />
              </div>
              <div>
                <p className="font-bold text-gray-800">Sample Payment Link</p>
                <p className="text-xs text-gray-400">{data.payment_url}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This is a <strong>demo payment flow</strong>. In production this would open your airline's
              secure payment gateway. Press <strong>OK</strong> to simulate a successful payment.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleModalOk}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: config.primary }}
              >
                OK, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-xs text-gray-700 text-right ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}
