export function SignInRequired() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-slate-800/70 rounded-lg p-8 shadow-md flex flex-col items-center border border-slate-700 max-w-sm">
        <svg
          className="w-12 h-12 mb-4 text-cyan-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-9 7.5A7.5 7.5 0 0112 15a7.5 7.5 0 014.5 3"
          />
        </svg>
        <h2 className="text-lg font-semibold mb-2 text-white">Sign In Required</h2>
        <p className="text-sm text-slate-300 mb-6 text-center">
          Please sign in to access and reserve instruments.
        </p>
      </div>
    </div>
  )
}
