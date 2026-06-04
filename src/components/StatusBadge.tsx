import { TICKET_STATUS } from "@/types";

type Status = keyof typeof TICKET_STATUS;

export default function StatusBadge({ status }: { status: string }) {
  const s = TICKET_STATUS[status as Status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}
