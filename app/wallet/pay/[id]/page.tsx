import type { Metadata } from "next";
import { PayView } from "@/components/wallet/PayView";

export const metadata: Metadata = {
  title: "Оплата",
  description: "Подтверждение платежа Zevora.",
};

/**
 * The provider's checkout, standing in.
 *
 * With a real acquirer configured, `pay_url` points at that acquirer and
 * this page is never opened. It exists so the bundled test provider has
 * somewhere to send the customer, and so the whole order → payment →
 * webhook → credit path can be walked end to end.
 */
export async function generateStaticParams() {
  // The static export cannot know an order id, so it emits one shell and
  // the client reads the id from the address bar.
  return [{ id: "order" }];
}

export default function PayPage() {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-10 sm:px-6 lg:py-16">
      <PayView />
    </div>
  );
}
