export default function QuickModeHome({ setAppState }) {
  const buttons = [
    {
      label: 'PAY',
      sub: 'Scan QR to pay at stores',
      icon: '💳',
      color: 'border-card-green bg-green-50',
      iconBg: 'bg-card-green',
      action: () => setAppState('LISTENING'),
    },
    {
      label: 'CATALOGUE',
      sub: 'See promotions and offers',
      icon: '📢',
      color: 'border-card-yellow bg-orange-50',
      iconBg: 'bg-card-yellow',
      action: () => setAppState('PROMOTIONS'),
    },
    {
      label: 'VOICE ASSIST',
      sub: 'Tap and speak what you need',
      icon: '🎙️',
      color: 'border-card-purple bg-purple-50',
      iconBg: 'bg-card-purple',
      action: () => setAppState('LISTENING'),
    },
    {
      label: 'CALL HELPER',
      sub: 'Call Touch \'n Go customer support',
      icon: '📞',
      color: 'border-card-red bg-red-50',
      iconBg: 'bg-card-red',
      action: () => setAppState('HELPER'),
    },
  ];

  return (
    <div className="px-6 pt-6 pb-8 animate-float-up">
      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className={`${btn.color} border-2 rounded-2xl p-6 text-left transition-transform active:scale-95 shadow-sm hover:shadow-lg cursor-pointer`}
          >
            <div className={`${btn.iconBg} w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow`}>
              {btn.icon}
            </div>
            <p className="font-bold text-gray-800 text-xl leading-tight">{btn.label}</p>
            <p className="text-base text-gray-500 mt-1.5 leading-snug">{btn.sub}</p>
          </button>
        ))}
      </div>

      {/* Full-width Call Family */}
      <button
        onClick={() => setAppState('FAMILY')}
        className="w-full border-2 border-card-teal bg-cyan-50 rounded-2xl p-6 flex items-center gap-5 transition-transform active:scale-95 shadow-sm hover:shadow-lg cursor-pointer"
      >
        <div className="bg-card-teal w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow">
          👨‍👩‍👧
        </div>
        <div className="text-left">
          <p className="font-bold text-gray-800 text-xl">CALL FAMILY</p>
          <p className="text-base text-gray-500 mt-1">Call your family member</p>
        </div>
      </button>
    </div>
  );
}
