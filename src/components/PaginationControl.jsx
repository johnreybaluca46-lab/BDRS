import React, { useEffect } from 'react';

export default function PaginationControl({
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalItems
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // If records are deleted making the current page invalid, move to the last valid page
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage, setCurrentPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleRowsChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="doc-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
      <div className="doc-pagination-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span>Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} entries</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', color: '#4a5568' }}>Rows:</label>
          <select 
            value={itemsPerPage} 
            onChange={handleRowsChange}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              border: '1px solid #cbd5e0', 
              backgroundColor: 'white', 
              color: '#4a5568', 
              outline: 'none', 
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div className="pagination-controls">
        <button 
          className="page-btn" 
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >&lt;</button>
        
        {Array.from({ length: totalPages }).map((_, i) => (
          <button 
            key={i + 1} 
            className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
            onClick={() => handlePageChange(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        
        <button 
          className="page-btn" 
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >&gt;</button>
      </div>
    </div>
  );
}
