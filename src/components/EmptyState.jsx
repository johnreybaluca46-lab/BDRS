import React from 'react';
import '../lib/my-requests.css'; // This imports the .empty-requests class

export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="empty-requests">
      {Icon && <Icon size={48} />}
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}
