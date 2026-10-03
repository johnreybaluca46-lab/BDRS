import React from 'react';
import './lib/SkeletonTimeline.css';

export default function SkeletonTimeline() {
  return (
    <div className="user-timeline skeleton-timeline">
      {[1, 2, 3, 4, 5].map(i => (
        <div className="timeline-item" key={i}>
          <div className="timeline-icon skeleton-timeline-icon"></div>
          <div className="timeline-content skeleton-timeline-content">
            <div className="skeleton-timeline-title"></div>
            <div className="skeleton-timeline-date"></div>
            <div className="skeleton-timeline-details"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
