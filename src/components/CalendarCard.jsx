import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const CalendarCard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const numDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= numDays; i++) {
    days.push(i);
  }
  
  // Fill the rest of the week if it doesn't end on a Saturday
  const totalCells = Math.ceil(days.length / 7) * 7;
  while (days.length < totalCells) {
    days.push(null);
  }

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <div className="calendar-card-container">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#eef2ff', color: '#4f46e5', padding: '12px', borderRadius: '12px', display: 'flex' }}>
            <Calendar size={24} strokeWidth={2} />
          </div>
          <div>
            <h3 className="calendar-header-title">
              {monthName} {year}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>Select a date</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handlePrevMonth} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', color: '#1e293b' }}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={handleNextMonth} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', color: '#1e293b' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="calendar-grid-row" style={{ textAlign: 'center', marginBottom: '8px' }}>
        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day, idx) => (
          <div key={day} className="calendar-day-header" style={{ 
            fontWeight: 700, 
            color: '#64748b', 
            backgroundColor: '#f8fafc',
            borderRadius: idx === 0 ? '8px 0 0 8px' : idx === 6 ? '0 8px 8px 0' : '0' 
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-row" style={{ flexGrow: 1 }}>
        {days.map((day, idx) => {
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;
          const today = day && isToday(day);
          
          return (
            <div 
              key={idx} 
              className="calendar-cell-date"
              style={{ 
                backgroundColor: day ? (isWeekend ? '#f8fafc' : 'white') : '#f1f5f9',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: day ? 'pointer' : 'default',
                fontWeight: 600,
                color: day ? (isWeekend ? '#1d4ed8' : '#0f172a') : 'transparent',
                border: day && !isWeekend ? '1px solid #f8fafc' : 'none'
              }}
            >
              {today ? (
                <div style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)'
                }}>
                  {day}
                </div>
              ) : (
                day || ''
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarCard;
