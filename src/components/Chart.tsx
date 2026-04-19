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
  const topProductsTicks = type === 'top-products'
    ? Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * (4 - index)))
    : [];

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{title}</h3>
      
      {type === 'top-products' ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 sm:p-5">
          <div className="relative h-[340px] sm:h-[380px]">
            <div className="absolute inset-0 flex flex-col justify-between pb-14 pr-10">
              {topProductsTicks.map((tick) => (
                <div key={tick} className="relative border-t border-dashed border-slate-300/90">
                  <span className="absolute -right-10 -top-3 text-xs sm:text-sm text-slate-500">{tick}</span>
                </div>
              ))}
            </div>

            <div className="absolute inset-x-0 bottom-14 top-3 flex items-end justify-around gap-2 sm:gap-4 pr-10">
              {data.map((item, index) => {
                const barHeight = `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%`;

                return (
                  <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-700">{item.value.toLocaleString()}</span>
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className="w-full max-w-[72px] rounded-t-2xl bg-gradient-to-b from-blue-500 to-indigo-600 shadow-[0_10px_24px_rgba(79,70,229,0.28)] transition-all duration-300"
                        style={{ height: barHeight }}
                      ></div>
                    </div>
                    <div className="min-h-[44px] text-center">
                      <div className="line-clamp-2 text-xs sm:text-sm font-medium text-slate-700">{item.name}</div>
                      {item.meta && <div className="mt-1 text-[11px] text-slate-500">{item.meta}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-indigo-600">
            <span className="inline-block h-3 w-6 rounded-sm bg-indigo-600"></span>
            <span>مبيعات المنتج</span>
          </div>
        </div>
      ) : type === 'sales' ? (
        <div className="space-y-2 sm:space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-16 sm:w-20 lg:w-28 text-xs text-gray-600 flex-shrink-0 line-clamp-2">{item.name}</div>
              <div className="flex-1 mx-2 sm:mx-3">
                <div className="bg-gray-200 rounded-full h-1.5 sm:h-2">
                  <div
                    className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
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