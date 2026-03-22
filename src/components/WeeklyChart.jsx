import React from 'react';

export default function WeeklyChart({ stepsData, stepGoal }) {
  // Generate the last 7 dates ending in today
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    let dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    if (i === 0) dayLabel = 'Today';
    
    last7Days.push({
      date: dateStr,
      label: dayLabel,
      steps: stepsData[dateStr] || 0
    });
  }

  // Fallback goal
  const goal = stepGoal || 8000;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <h2 className="font-bold text-gray-800 text-lg mb-6">This Week's Progress</h2>
      <div className="flex justify-between items-end h-48 gap-2">
        {last7Days.map((day) => {
          const pct = Math.min(100, (day.steps / goal) * 100);
          
          let barColor = 'bg-gray-100'; // very light gray for no data
          if (day.steps >= goal) {
            barColor = 'bg-[#22c55e]'; // green
          } else if (day.steps > 0) {
            barColor = 'bg-green-300'; // lighter green
          }

          return (
            <div key={day.date} className="flex flex-col items-center flex-1">
              {/* Step count over top */}
              <span className="text-[10px] font-bold text-gray-400 mb-1.5 h-4 text-center">
                {day.steps > 0 
                  ? (day.steps >= 1000 ? (day.steps / 1000).toFixed(1) + 'k' : day.steps) 
                  : ''}
              </span>
              
              {/* Bar container */}
              <div className="w-full relative bg-gray-50 flex flex-col justify-end overflow-hidden rounded-md" style={{ height: '140px' }}>
                <div 
                  className={`w-full transition-all duration-700 ease-in-out ${barColor} ${day.steps > 0 && day.steps < goal ? 'rounded-t-md rounded-b-md' : 'rounded-md'}`} 
                  style={{ height: day.steps > 0 ? `${Math.max(5, pct)}%` : '100%' }}
                ></div>
              </div>

              {/* Day label */}
              <span className={`text-[11px] mt-2 tracking-wide uppercase ${day.label === 'Today' ? 'font-extrabold text-[#22c55e]' : 'font-bold text-gray-500'}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
