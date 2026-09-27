import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <div className="calendar-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: '#1a202c' }}>
          {monthName} {year}
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrevMonth} style={{ background: '#edf2f7', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
            <ChevronLeft size={16} color="#4a5568" />
          </button>
          <button onClick={handleNextMonth} style={{ background: '#edf2f7', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
            <ChevronRight size={16} color="#4a5568" />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '10px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#718096' }}>{day}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center' }}>
        {days.map((day, idx) => (
          <div 
            key={idx} 
            style={{ 
              padding: '8px 0', 
              fontSize: '0.9rem', 
              color: day ? (isToday(day) ? '#fff' : '#4a5568') : 'transparent',
              backgroundColor: day && isToday(day) ? '#3182ce' : 'transparent',
              borderRadius: '50%',
              fontWeight: isToday(day) ? 'bold' : 'normal',
              cursor: day ? 'pointer' : 'default',
              transition: 'background-color 0.2s',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 'auto'
            }}
          >
            {day || ''}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarCard;
