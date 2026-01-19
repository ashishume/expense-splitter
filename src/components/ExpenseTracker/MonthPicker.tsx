import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface MonthPickerProps {
    isOpen: boolean;
    onClose: () => void;
    currentMonth: string; // Format: "YYYY-MM"
    onMonthSelect: (month: string) => void;
    maxMonth?: string; // Optional max selectable month
}

const MonthPicker = ({
    isOpen,
    onClose,
    currentMonth,
    onMonthSelect,
    maxMonth,
}: MonthPickerProps) => {
    const [selectedYear, setSelectedYear] = useState(() => {
        const [year] = currentMonth.split("-");
        return parseInt(year);
    });

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // Generate year range (last 5 years + current year)
    const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);

    useEffect(() => {
        if (isOpen) {
            const [year] = currentMonth.split("-");
            setSelectedYear(parseInt(year));
        }
    }, [isOpen, currentMonth]);

    const handleYearChange = (delta: number) => {
        setSelectedYear((prev) => prev + delta);
    };

    const handleMonthClick = (monthIndex: number) => {
        const year = selectedYear;
        const month = (monthIndex + 1).toString().padStart(2, "0");
        const selectedMonthStr = `${year}-${month}`;

        // Check if month is in the future
        if (maxMonth && selectedMonthStr > maxMonth) {
            return; // Don't allow future months
        }

        onMonthSelect(selectedMonthStr);
        onClose();
    };

    const isMonthDisabled = (monthIndex: number) => {
        if (!maxMonth) return false;
        const monthStr = `${selectedYear}-${(monthIndex + 1).toString().padStart(2, "0")}`;
        return monthStr > maxMonth;
    };

    const isMonthSelected = (monthIndex: number) => {
        const [currentYear, currentMonthNum] = currentMonth.split("-");
        return monthIndex === (parseInt(currentMonthNum) - 1) && selectedYear === parseInt(currentYear);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800">Select Month</h3>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Year Selector */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <button
                            onClick={() => handleYearChange(-1)}
                            disabled={selectedYear <= years[0]}
                            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="text-xl font-bold text-gray-800">
                            {selectedYear}
                        </span>

                        <button
                            onClick={() => handleYearChange(1)}
                            disabled={selectedYear >= currentYear}
                            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Month Grid */}
                    <div className="p-6">
                        <div className="grid grid-cols-3 gap-3">
                            {months.map((month, index) => {
                                const disabled = isMonthDisabled(index);
                                const selected = isMonthSelected(index);
                                const isCurrent = selectedYear === currentYear && index === currentMonthIndex;

                                return (
                                    <button
                                        key={month}
                                        onClick={() => handleMonthClick(index)}
                                        disabled={disabled}
                                        className={`
                      py-3 px-4 rounded-lg font-medium text-sm transition-all
                      ${disabled
                                                ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                                : selected
                                                    ? "bg-indigo-500 text-white shadow-md"
                                                    : isCurrent
                                                        ? "bg-indigo-50 text-indigo-600 border-2 border-indigo-200"
                                                        : "bg-gray-50 text-gray-700 hover:bg-indigo-100 hover:text-indigo-600"
                                            }
                    `}
                                    >
                                        {month}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MonthPicker;