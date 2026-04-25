export default function CallFamily({ onBack }) {
  const contacts = [
    { name: 'Son - Ahmad', phone: '012-345-6789', emoji: '👨' },
    { name: 'Daughter - Mei Ling', phone: '016-789-0123', emoji: '👩' },
    { name: 'Grandson - Raj', phone: '019-456-7890', emoji: '👦' },
  ];

  return (
    <div className="px-6 pt-6 pb-8 animate-float-up">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-2xl active:scale-90 transition-transform cursor-pointer"
        >
          ←
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Call Family</h2>
      </div>

      <div className="flex flex-col gap-4">
        {contacts.map((contact) => (
          <div
            key={contact.name}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-5"
          >
            <div className="w-16 h-16 rounded-full bg-card-teal/20 flex items-center justify-center text-4xl shrink-0">
              {contact.emoji}
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-gray-800 text-xl">{contact.name}</p>
              <p className="text-base text-gray-500">{contact.phone}</p>
            </div>
            <button className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-3xl shadow active:scale-90 transition-transform cursor-pointer shrink-0">
              📞
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <p className="text-base text-blue-600">Demo mode - calls are simulated</p>
      </div>
    </div>
  );
}
