type PaymentBadgeProps = {
  paymentMethod: string;
  size?: "sm" | "md";
  className?: string;
};

const styles: Record<string, string> = {
  cash: "bg-green-100 text-green-700 font-bold border border-green-300",
  transfer: "bg-blue-100 text-blue-600 font-medium border border-blue-200",
  credit: "bg-blue-100 text-blue-700 font-medium border border-blue-200",
};

const labels: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  credit: "เครดิต",
};

export function PaymentBadge({ paymentMethod, size = "sm", className = "" }: PaymentBadgeProps) {
  const key = (paymentMethod || "cash").toLowerCase();
  const style = styles[key] ?? "bg-gray-100 text-gray-700 font-medium border border-gray-200";
  const label = labels[key] ?? paymentMethod ?? "-";
  const sizeClass = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span className={`inline-flex items-center rounded-full ${sizeClass} ${style} ${className}`}>
      {label}
    </span>
  );
}