"use client";

export function NewsletterForm() {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
        if (email) alert(`Subscribed: ${email}`);
        form.reset();
      }}
    >
      <input
        name="email"
        type="email"
        placeholder="Email address"
        required
        className="flex-1 min-w-0 bg-ds-overlay text-ds-text placeholder:text-ds-text-muted px-4 py-2.5 rounded-xl text-[13px] border border-ds-border focus:outline-none focus:border-ds-purple/50 transition-colors"
      />
      <button
        type="submit"
        className="bg-linear-to-r from-ds-purple to-ds-purple-500 text-white px-3 py-2.5 rounded-xl hover:shadow-[0_0_16px_rgba(109,40,217,0.4)] transition-all cursor-pointer"
        aria-label="Subscribe"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 16">
          <path d="M18 0H2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V2a2 2 0 00-2-2zm0 4l-8 5-8-5V2l8 5 8-5v2z" />
        </svg>
      </button>
    </form>
  );
}
