import type { DayUpload } from '../../lib/statistics';

interface TimelineGraphProps {
  data: DayUpload[];
}

export function TimelineGraph({ data }: TimelineGraphProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-warm-taupe">
        Aucune donnée disponible
      </div>
    );
  }

  // Find max count for scaling
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Calculate bar height percentage
  const getBarHeight = (count: number) => {
    return (count / maxCount) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Graph */}
      <div className="h-48 flex items-end justify-between gap-1 sm:gap-2">
        {data.map((day, index) => {
          const height = getBarHeight(day.count);
          const isToday = day.date === new Date().toISOString().split('T')[0];

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end group cursor-pointer"
              title={`${day.displayDate}: ${day.count} upload${day.count > 1 ? 's' : ''}`}
            >
              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  isToday
                    ? 'bg-[#ae1725] hover:bg-[#ae1725]/80'
                    : 'bg-[#ae1725]/60 hover:bg-[#ae1725]'
                }`}
                style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0px' }}
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-full mb-2 bg-deep-charcoal text-ivory text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                  <div className="font-semibold">{day.displayDate}</div>
                  <div>{day.count} upload{day.count > 1 ? 's' : ''}</div>
                  <div className="text-silver-mist text-[10px]">
                    📸 {day.photos} • 🎥 {day.videos}
                  </div>
                </div>
              </div>

              {/* Date label (show every nth label based on count) */}
              {(data.length <= 7 || index % Math.ceil(data.length / 7) === 0) && (
                <div className="text-[10px] text-warm-taupe mt-1 text-center truncate w-full">
                  {day.displayDate}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-warm-taupe">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#ae1725]/60 rounded"></div>
          <span>Jour normal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#ae1725] rounded"></div>
          <span>Aujourd'hui</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="bg-pearl-white dark:bg-deep-charcoal/30 p-3 rounded-lg">
          <div className="text-2xl font-bold text-[#ae1725]">
            {data.length}
          </div>
          <div className="text-xs text-warm-taupe dark:text-silver-mist">
            Jours actifs
          </div>
        </div>
        <div className="bg-pearl-white dark:bg-deep-charcoal/30 p-3 rounded-lg">
          <div className="text-2xl font-bold text-[#ae1725]">
            {Math.round(data.reduce((sum, d) => sum + d.count, 0) / data.length)}
          </div>
          <div className="text-xs text-warm-taupe dark:text-silver-mist">
            Moyenne / jour
          </div>
        </div>
        <div className="bg-pearl-white dark:bg-deep-charcoal/30 p-3 rounded-lg">
          <div className="text-2xl font-bold text-[#ae1725]">
            {maxCount}
          </div>
          <div className="text-xs text-warm-taupe dark:text-silver-mist">
            Pic uploads
          </div>
        </div>
      </div>
    </div>
  );
}
