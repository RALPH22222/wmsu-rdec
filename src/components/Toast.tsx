interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed top-20 right-6 z-50 flex items-center gap-3 rounded-sm border border-red-200 bg-white px-5 py-3.5 text-slate-800 shadow-lg animate-fade-in-down">
      <div className="w-8 h-8 rounded-xl bg-[#C8102E] flex items-center justify-center text-white shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-[#C8102E]">Portal Notification</p>
        <p className="text-xs text-slate-600">{message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 text-slate-400 hover:text-[#C8102E] cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
