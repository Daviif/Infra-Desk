interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white flex-wrap gap-2">
      <span className="text-xs text-gray-500">
        <span className="hidden sm:inline">Mostrando {from}–{to} de </span>
        {total} resultados
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(1)}
          disabled={page === 1}
          className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default"
        >
          «
        </button>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default"
        >
          <span className="hidden sm:inline">← </span>Ant
        </button>
        <span className="px-2 py-1 text-xs text-gray-700">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default"
        >
          Próx<span className="hidden sm:inline"> →</span>
        </button>
        <button
          onClick={() => onChange(totalPages)}
          disabled={page === totalPages}
          className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default"
        >
          »
        </button>
      </div>
    </div>
  );
}
