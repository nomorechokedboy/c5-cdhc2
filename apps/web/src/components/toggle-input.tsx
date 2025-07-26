import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Edit3 } from 'lucide-react';
import { EllipsisText } from './data-table/ellipsis-text';

interface ToggleInputProps {
        initialValue?: string;
        placeholder?: string;
        onSave?: (value: string) => void;
        className?: string;
}

export default function ToggleInput({
        initialValue = '',
        placeholder = 'Click to edit...',
        onSave,
        className = '',
}: ToggleInputProps) {
        const [isEditing, setIsEditing] = useState(false);
        const [value, setValue] = useState(initialValue);
        const [tempValue, setTempValue] = useState(initialValue);
        const inputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
                if (isEditing && inputRef.current) {
                        inputRef.current.focus();
                        inputRef.current.select();
                }
        }, [isEditing]);

        const handleSave = () => {
                setValue(tempValue);
                setIsEditing(false);
                onSave?.(tempValue);
        };

        const handleCancel = () => {
                setTempValue(value);
                setIsEditing(false);
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                        handleSave();
                } else if (e.key === 'Escape') {
                        handleCancel();
                }
        };

        const handleDoubleClick = () => {
                setIsEditing(true);
                setTempValue(value);
        };

        if (isEditing) {
                return (
                        <div className={`flex items-center gap-2 ${className}`}>
                                <Input
                                        ref={inputRef}
                                        value={tempValue}
                                        onChange={(e) =>
                                                setTempValue(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        onBlur={handleCancel}
                                        className="flex-1"
                                        placeholder={placeholder}
                                />
                                <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleSave}
                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                        <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancel}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                        <X className="h-4 w-4" />
                                </Button>
                        </div>
                );
        }

        return (
                <div
                        className={`group flex items-center gap-2 min-h-[40px] px-3 py-2 border border-transparent rounded-md cursor-pointer hover:border-border hover:bg-muted/50 transition-colors ${className}`}
                        onDoubleClick={handleDoubleClick}
                >
                        <EllipsisText
                                className={`flex-1 ${!value ? 'text-muted-foreground' : ''}`}
                        >
                                {value || placeholder}
                        </EllipsisText>
                        <Edit3 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
        );
}
