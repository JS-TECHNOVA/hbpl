export default function NotificationBanner() {
  return (
    <div className="relative bg-accent text-accent-dark flex items-center justify-center gap-4 px-6 py-3 shadow-[0px_10px_15px_-3px_rgba(253,139,0,0.2)]">
      <svg
        className="w-4 h-4 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-sm font-semibold tracking-tight">
        Upcoming: General Aptitude Competition 2024. Registration closes in 3
        days!
      </p>
      <a
        href="/exams"
        className="shrink-0 bg-accent-dark text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-accent-darker transition-colors"
      >
        Apply Now
      </a>
    </div>
  );
}
