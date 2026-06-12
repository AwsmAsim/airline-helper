import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { PassengerStrip } from './components/PassengerStrip';
import { MessageBubble } from './components/MessageBubble';
import { EscalationCard } from './components/EscalationCard';
import { PaymentCard } from './components/PaymentCard';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { SuggestedQuestions } from './components/SuggestedQuestions';
import { ChatInput } from './components/ChatInput';
import { useChat } from './useChat';
import type { AirlineConfig, Message } from './types';
import { PlaneTakeoff, Shield, Clock, Phone } from 'lucide-react';

interface Props {
  config: AirlineConfig;
}

export function ChatApp({ config }: Props) {
  const { messages, status, currentToolCall, sendMessage, isLoading } = useChat({
    airline: config.id,
    apiUrl: config.apiUrl,
    passengerName: config.passenger.name,
    flightInfo: `${config.passenger.flight} ${config.passenger.from}→${config.passenger.to} ${config.passenger.date}`,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Render any message type — normal bubble, escalation card, or payment card
  const renderMessage = (msg: Message) => {
    if (msg.escalation) {
      return <EscalationCard key={msg.id} data={msg.escalation} config={config} />;
    }
    if (msg.serviceAction) {
      return <PaymentCard key={msg.id} data={msg.serviceAction} config={config} />;
    }
    return <MessageBubble key={msg.id} message={msg} config={config} />;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSend = (text: string) => {
    setShowSuggestions(false);
    sendMessage(text);
  };

  const handleSuggestedQuestion = (q: string) => {
    setShowSuggestions(false);
    sendMessage(q);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ fontFamily: config.fontBody, background: '#F4F6F9' }}>

      {/* ── MOBILE: stacked layout (shown below lg) ── */}
      <div className="flex flex-col flex-1 overflow-hidden lg:hidden">
        <Header config={config} />
        <PassengerStrip config={config} />
        <div className="flex-1 overflow-y-auto py-3 scroll-smooth">
          {messages.length === 0 ? (
            <WelcomeScreen config={config} />
          ) : (
            messages.map(msg => renderMessage(msg))
          )}
          <ThinkingIndicator status={status} toolCall={currentToolCall} config={config} />
          <div ref={bottomRef} />
        </div>
        {showSuggestions && messages.length === 0 && (
          <SuggestedQuestions config={config} onSelect={handleSuggestedQuestion} />
        )}
        <ChatInput config={config} onSend={handleSend} disabled={isLoading} />
      </div>

      {/* ── DESKTOP: two-column layout (shown at lg+) ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <aside
          className="w-80 xl:w-96 flex flex-col flex-shrink-0 overflow-y-auto"
          style={{ background: `linear-gradient(160deg, ${config.primaryDark} 0%, ${config.primary} 100%)` }}
        >
          {/* Brand area */}
          <div className="px-6 pt-8 pb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md overflow-hidden">
                <img src={config.logoUrl} alt={config.name} className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: config.fontHeading }}>
                  {config.name}
                </h1>
                <p className="text-white/60 text-xs">{config.tagline}</p>
              </div>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              AI-powered support, backed by official {config.name} documentation.
            </p>
          </div>

          {/* Passenger card */}
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden bg-white/10 backdrop-blur border border-white/20">
            {/* Passenger header */}
            <div className="px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: config.accent, color: config.primaryDark }}
                >
                  {config.passenger.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{config.passenger.name}</p>
                  <p className="text-white/60 text-xs">Passenger</p>
                </div>
              </div>
            </div>
            {/* Flight row */}
            <div className="px-5 py-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{config.passenger.from}</p>
                  <p className="text-white/60 text-xs mt-0.5 truncate max-w-[80px]">{config.passenger.fromCity}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <PlaneTakeoff size={16} className="text-white/60" />
                  <div className="h-px w-12 bg-white/30" />
                  <p className="text-white/60 text-xs">{config.passenger.flight}</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{config.passenger.to}</p>
                  <p className="text-white/60 text-xs mt-0.5 truncate max-w-[80px]">{config.passenger.toCity}</p>
                </div>
              </div>
            </div>
            {/* Details grid */}
            <div className="px-5 py-3 grid grid-cols-2 gap-3">
              <SidebarDetail label="PNR" value={config.passenger.pnr} mono />
              <SidebarDetail label="Date" value={config.passenger.date} />
              <SidebarDetail label="Class" value={config.passenger.class} />
              <SidebarDetail label="Status" value="Confirmed" accent={config.accent} />
            </div>
          </div>

          {/* Trust badges */}
          <div className="mx-4 mb-4 space-y-2">
            <TrustBadge icon={<Shield size={14} />} text="Official airline docs" />
            <TrustBadge icon={<Clock size={14} />} text="Available 24/7" />
            <TrustBadge icon={<Phone size={14} />} text="Human escalation ready" />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

        </aside>

        {/* Right chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop header — slim version */}
          <div
            className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Customer Support · Online</span>
            </div>
            <span
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: `${config.primary}15`, color: config.primary }}
            >
              ✦ Powered by AI
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 px-2 scroll-smooth">
            {messages.length === 0 ? (
              <DesktopWelcome config={config} onSelect={handleSuggestedQuestion} showSuggestions={showSuggestions} />
            ) : (
              <>
                {messages.map(msg => renderMessage(msg))}
                <ThinkingIndicator status={status} toolCall={currentToolCall} config={config} />
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <ChatInput config={config} onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

/* ─── Desktop welcome screen (embedded in chat panel) ─── */
function DesktopWelcome({
  config,
  onSelect,
  showSuggestions,
}: {
  config: AirlineConfig;
  onSelect: (q: string) => void;
  showSuggestions: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-10 text-center">
      <h2 className="font-bold text-gray-800 text-2xl mb-2" style={{ fontFamily: config.fontHeading }}>
        Hi, {config.passenger.name.split(' ')[0]}! 👋
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-sm mb-8">
        I'm your {config.name} support agent. Ask me anything about your upcoming
        flight, baggage, check-in, or refunds.
      </p>

      {showSuggestions && (
        <div className="w-full max-w-lg">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Quick questions</p>
          <DesktopSuggestions config={config} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

function DesktopSuggestions({ config, onSelect }: { config: AirlineConfig; onSelect: (q: string) => void }) {
  const questionSets: Record<string, string[]> = {
    fly91:      ['What is the baggage allowance?', 'How do I do web check-in?', 'What is the refund policy?', 'How do I contact Fly91 support?'],
    starair:    ['What is the baggage allowance?', 'Can I change my flight?', 'What are the fare rules?', 'How do I reach Star Air?'],
    spicejet:   ['What is the baggage allowance?', 'What is SpiceMax?', 'How do I cancel my flight?', 'What is Zero Cancellation?'],
    allianceair:['What is the baggage allowance?', 'What is the refund process?', 'How do I check in online?', 'How do I contact Alliance Air?'],
  };
  const questions = questionSets[config.id] ?? questionSets['fly91'];

  return (
    <div className="grid grid-cols-2 gap-3">
      {questions.map(q => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5"
          style={{
            borderColor: `${config.primary}30`,
            color: config.primary,
            background: `${config.primary}08`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${config.primary}15`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${config.primary}08`;
          }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

/* ─── Mobile welcome (unchanged) ─── */
function WelcomeScreen({ config }: { config: AirlineConfig }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-10 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-md bg-white overflow-hidden">
        <img src={config.logoUrl} alt={config.name} className="w-13 h-13 object-contain p-1" />
      </div>
      <h2 className="font-bold text-gray-800 mb-1.5" style={{ fontFamily: config.fontHeading, fontSize: '18px' }}>
        Hi, {config.passenger.name.split(' ')[0]}! 👋
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
        I'm your {config.name} support agent. I can help with baggage, check-in,
        refunds, and anything about your journey.
      </p>
      <div
        className="mt-4 text-xs px-3 py-1.5 rounded-full"
        style={{ background: `${config.primary}12`, color: config.primary }}
      >
        ✦ Powered by AI · Backed by official {config.name} docs
      </div>
    </div>
  );
}

/* ─── Sidebar helpers ─── */
function SidebarDetail({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div>
      <p className="text-white/40 uppercase tracking-wide" style={{ fontSize: '10px' }}>{label}</p>
      <p
        className={`text-sm font-semibold mt-0.5 ${mono ? 'font-mono' : ''}`}
        style={{ color: accent ?? 'white' }}
      >
        {value}
      </p>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-white/50 text-xs">
      <span className="text-white/40">{icon}</span>
      {text}
    </div>
  );
}
