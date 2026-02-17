/** По сколько элементов показывать на одной странице (при большем числе — навигация по страницам) */
export const ITEMS_PER_PAGE = 6;

export function PaginationBar({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination-bar" aria-label="Навигация по страницам">
      <div className="pagination-bar-inner">
        <button
          type="button"
          className="btn secondary pagination-btn"
          onClick={onPrev}
          disabled={currentPage <= 1}
          aria-label="Предыдущая страница"
        >
          ← Назад
        </button>
        <span className="pagination-info muted">
          Страница {currentPage} из {totalPages}
        </span>
        <button
          type="button"
          className="btn secondary pagination-btn"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          aria-label="Следующая страница"
        >
          Вперёд →
        </button>
      </div>
    </nav>
  );
}
