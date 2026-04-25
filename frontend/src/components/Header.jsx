export default function Header({ language, setLanguage }) {
  return (
    <div className="bg-tng-header text-white px-6 pt-5 pb-5">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">&#9776;</span>
          <span className="font-bold text-2xl tracking-wide">QUICK MODE</span>
        </div>
        <img src="/logo.webp" alt="Talk n Go" className="h-14 rounded" />
        <div className="flex items-center gap-2">
          <span className="text-base opacity-80">EN</span>
        </div>
      </div>

      {/* Language toggle */}
      <div className="flex gap-3 justify-center">
        {[
          { key: 'en', label: 'EN', flag: '🇬🇧' },
          { key: 'bm', label: 'BM', flag: '🇲🇾' },
          { key: 'zh', label: '中文', flag: '🇨🇳' },
        ].map((lang) => (
          <button
            key={lang.key}
            onClick={() => setLanguage(lang.key)}
            className={`px-6 py-2.5 rounded-full text-lg font-semibold transition-all ${
              language === lang.key
                ? 'bg-tng-yellow text-tng-blue shadow-md'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {lang.flag} {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
