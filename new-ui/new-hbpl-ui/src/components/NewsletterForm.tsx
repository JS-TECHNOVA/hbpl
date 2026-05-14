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
        className="flex-1 min-w-0 bg-primary-darker text-white placeholder:text-text-muted px-4 py-3 rounded-lg text-sm border border-white/10 focus:outline-none focus:border-primary-light"
      />
      <button
        type="submit"
        className="bg-accent px-3 py-3 rounded-lg hover:bg-accent-cta transition-colors cursor-pointer"
        aria-label="Subscribe"
      >
        <svg className="w-5 h-4" fill="currentColor" viewBox="0 0 20 16">
          <path d="M18 0H2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V2a2 2 0 00-2-2zm0 4l-8 5-8-5V2l8 5 8-5v2z" />
        </svg>
      </button>
    </form>
  );
}
