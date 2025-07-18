import {
        Tooltip,
        TooltipContent,
        TooltipProvider,
        TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface EllipsisTextProps {
        children?: ReactNode;
        className?: string;
        maxWidth?: string;
}

export function EllipsisText({
        children,
        className,
        maxWidth = '200px',
}: EllipsisTextProps) {
        return (
                <TooltipProvider>
                        <Tooltip>
                                <TooltipTrigger asChild>
                                        <span
                                                className={cn(
                                                        'inline-block truncate cursor-help',
                                                        className
                                                )}
                                                style={{ maxWidth }}
                                        >
                                                {children}
                                        </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                        <p className="max-w-xs">{children}</p>
                                </TooltipContent>
                        </Tooltip>
                </TooltipProvider>
        );
}
