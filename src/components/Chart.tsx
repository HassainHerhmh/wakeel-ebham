interface ChartData {
  name: string;
  value: number;
  meta?: string;
}

interface ChartProps {
  title: string;
  type: 'sales' | 'orders' | 'top-products';
  data: ChartData[];
}

export function Chart({ title, type, data }: ChartProps) {
  const maxValue = Math.max(...data.map(item => item.value), 1);

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{title}</h3>
      
      {type === 'sales' || type === 'top-products' ? (
        <div className="space-y-2 sm:space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-16 sm:w-20 lg:w-28 text-xs text-gray-600 flex-shrink-0 line-clamp-2">{item.name}</div>
              <div className="flex-1 mx-2 sm:mx-3">
                <div className="bg-gray-200 rounded-full h-1.5 sm:h-2">
                  <div
                    className={`${type === 'top-products' ? 'bg-emerald-500' : 'bg-green-500'} h-1.5 sm:h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  ></div>
                </div>
                {item.meta && (
                  <div className="mt-1 text-[11px] sm:text-xs text-gray-500">{item.meta}</div>
                )}
              </div>
              <div className="w-14 sm:w-16 lg:w-20 text-xs font-medium text-gray-900 text-left flex-shrink-0">
                {item.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="w-full max-w-xs sm:max-w-sm">
            {data.map((item, index) => {
              const total = data.reduce((sum, d) => sum + d.value, 0);
              const percentage = (item.value / total) * 100;
              const colors = ['#ffa500', '#10B981', '#F59E0B'];
              
              return (
                <div key={index} className="mb-2 sm:mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ml-2 flex-shrink-0"
                        style={{ backgroundColor: colors[index] }}
                      ></div>
                      <span className="text-xs sm:text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-xs font-medium flex-shrink-0">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}