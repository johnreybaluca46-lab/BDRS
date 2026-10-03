import React from 'react';
import './lib/SkeletonTable.css';

export default function SkeletonTable() {
  return (
    <div className="skeleton-table-wrapper">
      <div className="skeleton-table">
        <div className="skeleton-thead">
           <div className="skeleton-th"></div>
           <div className="skeleton-th"></div>
           <div className="skeleton-th"></div>
           <div className="skeleton-th"></div>
           <div className="skeleton-th"></div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-tbody-row">
            <div className="skeleton-td skeleton-avatar-cell"><div className="skeleton-avatar"></div><div className="skeleton-text-short"></div></div>
            <div className="skeleton-td"><div className="skeleton-text-long"></div></div>
            <div className="skeleton-td"><div className="skeleton-text-short"></div></div>
            <div className="skeleton-td"><div className="skeleton-badge"></div></div>
            <div className="skeleton-td"><div className="skeleton-icon"></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
