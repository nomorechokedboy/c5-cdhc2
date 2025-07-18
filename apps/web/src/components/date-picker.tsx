import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
        Popover,
        PopoverContent,
        PopoverTrigger,
} from '@/components/ui/popover';
import { useFieldContext } from '@/hooks/demo.form-context';
import { useStore } from '@tanstack/react-form';
import { ErrorMessages } from './demo.FormComponents';

function formatDate(date: Date | undefined) {
        if (!date) {
                return '';
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();

        return `${day}/${month}/${year}`;
}

function isValidDate(date: Date | undefined) {
        if (!date) {
                return false;
        }
        return !isNaN(date.getTime());
}

function parseDate(dateString: string): Date | undefined {
        if (!dateString) return undefined;

        // First try to parse as dd/mm/yyyy format
        const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = dateString.match(ddmmyyyyRegex);

        if (match) {
                const day = parseInt(match[1], 10);
                const month = parseInt(match[2], 10) - 1; // Month is 0-indexed
                const year = parseInt(match[3], 10);

                const date = new Date(year, month, day);

                // Validate that the date is correct (handles invalid dates like 31/02/2023)
                if (
                        date.getFullYear() === year &&
                        date.getMonth() === month &&
                        date.getDate() === day
                ) {
                        return date;
                }
        }

        // Also handle dd/mm/yy format for backward compatibility
        const ddmmyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
        const yyMatch = dateString.match(ddmmyyRegex);

        if (yyMatch) {
                const day = parseInt(yyMatch[1], 10);
                const month = parseInt(yyMatch[2], 10) - 1;
                let year = parseInt(yyMatch[3], 10);

                // Handle 2-digit years (assume 20xx for 00-30, 19xx for 31-99)
                year += year <= 30 ? 2000 : 1900;

                const date = new Date(year, month, day);

                if (
                        date.getFullYear() === year &&
                        date.getMonth() === month &&
                        date.getDate() === day
                ) {
                        return date;
                }
        }

        // Fallback to standard Date parsing for other formats
        const date = new Date(dateString);
        return isValidDate(date) ? date : undefined;
}

export interface DatePickerProps {
        label: string;
        placeholder?: string;
}

export default function DatePicker({ label, placeholder }: DatePickerProps) {
        const field = useFieldContext<string>();
        const errors = useStore(field.store, (state) => state.meta.errors);
        const [open, setOpen] = React.useState(false);

        // Parse the field value to get the current date
        const currentDate = React.useMemo(() => {
                return parseDate(field.state.value);
        }, [field.state.value]);

        const [month, setMonth] = React.useState<Date | undefined>(
                currentDate || new Date()
        );

        // Update month when date changes
        React.useEffect(() => {
                if (currentDate) {
                        setMonth(currentDate);
                }
        }, [currentDate]);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const inputValue = e.target.value;
                field.handleChange(inputValue);

                // Update month if valid date is entered
                const date = parseDate(inputValue);
                if (date) {
                        setMonth(date);
                }
        };

        const handleDateSelect = (date: Date | undefined) => {
                if (date) {
                        const formattedDate = formatDate(date);
                        field.handleChange(formattedDate);
                        setMonth(date);
                }
                setOpen(false);
        };

        return (
                <div className="flex flex-col gap-3">
                        <Label
                                htmlFor={label}
                                className="mb-2 text-xl font-bold"
                        >
                                {label}
                        </Label>
                        <div className="relative flex gap-2">
                                <Input
                                        id={label}
                                        value={field.state.value}
                                        placeholder={
                                                placeholder || 'dd/mm/yyyy'
                                        }
                                        className="bg-background pr-10"
                                        onBlur={field.handleBlur}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => {
                                                if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        setOpen(true);
                                                }
                                        }}
                                />
                                <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                                <Button
                                                        id="date-picker"
                                                        variant="ghost"
                                                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                                                >
                                                        <CalendarIcon className="size-3.5" />
                                                        <span className="sr-only">
                                                                Select date
                                                        </span>
                                                </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                                className="w-auto overflow-hidden p-0"
                                                align="end"
                                                alignOffset={-8}
                                                sideOffset={10}
                                        >
                                                <Calendar
                                                        mode="single"
                                                        selected={currentDate}
                                                        captionLayout="dropdown"
                                                        month={month}
                                                        onMonthChange={setMonth}
                                                        onSelect={
                                                                handleDateSelect
                                                        }
                                                />
                                        </PopoverContent>
                                </Popover>
                        </div>
                        {field.state.meta.isTouched && (
                                <ErrorMessages errors={errors} />
                        )}
                </div>
        );
}
