import React from 'react';
import { DivideIcon as LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: LucideIcon;
  onClick?: () => void;
}

export function StatCard({ title, value, change, changeType, icon: Icon, onClick }: StatCardProps) {
  return (
    <div 
      className={`bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer hover:bg-gray-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-gray-600 text-xs sm:text-sm font-medium leading-tight">{title}</p>
          <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 mt-1 break-words leading-tight">{value}</p>
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
        </div>
      </div>
      <div className="flex items-center mt-2 sm:mt-3 lg:mt-4">
        {changeType === 'increase' ? (
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 ml-1" />
        ) : (
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 ml-1" />
        )}
        <span className={`text-xs sm:text-sm font-medium ${
          changeType === 'increase' ? 'text-green-600' : 'text-red-600'
        }`}>
          {change}
        </span>
        <span className="text-gray-500 text-xs mr-1 hidden sm:inline">من الشهر الماضي</span>
      </div>
    </div>
  );
}