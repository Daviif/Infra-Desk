import { TICKET_STATUS, EQUIPMENT_STATUS } from "@/types";

const ALL_STATUS = { ...TICKET_STATUS, ...EQUIPMENT_STATUS };

export default function StatusBadge({ status }: { status: string }) {
  const s = ALL_STATUS[status as keyof typeof ALL_STATUS] ?? {
    label: status,
    color: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}
