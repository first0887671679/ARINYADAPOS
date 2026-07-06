import { getPaymentLabel, getPaymentBadgeStyle } from "@/lib/utils";

interface PaymentBadgeProps {
  method: string;
  className?: string;
}

export function PaymentBadge({ method, className = "" }: PaymentBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getPaymentBadgeStyle(method)} ${className}`}
    >
      {getPaymentLabel(method)}
    </span>
  );
}