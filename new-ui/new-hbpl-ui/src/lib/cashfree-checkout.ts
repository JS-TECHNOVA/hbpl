import type { CashfreePaymentOrder } from "@/src/lib/exams-api";

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<{ error?: { message?: string } } | undefined>;
    };
  }
}

export async function openCashfreeCheckout(order: CashfreePaymentOrder) {
  if (!window.Cashfree) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Cashfree checkout."));
      document.head.appendChild(script);
    });
  }
  if (!window.Cashfree) throw new Error("Cashfree checkout did not load. Please retry.");
  const result = await window.Cashfree({ mode: order.mode }).checkout({
    paymentSessionId: order.payment_session_id,
    redirectTarget: "_self",
  });
  if (result?.error) throw new Error(result.error.message || "Cashfree could not start checkout.");
}
