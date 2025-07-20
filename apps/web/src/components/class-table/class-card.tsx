import {
        Card,
        CardHeader,
        CardTitle,
        CardFooter,
        CardDescription,
} from '@/components/ui/card';
import type { Class } from '@/types';
import { EllipsisText } from '@/components/data-table/ellipsis-text';

interface ClassCardProps {
        data: Class;
        index: number;
}

export default function ClassCard({ data, index }: ClassCardProps) {
        return (
                <Card className="@container/card">
                        <CardHeader>
                                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                        {data.name}
                                </CardTitle>
                                <EllipsisText>
                                        <CardDescription>
                                                {data.description}
                                        </CardDescription>
                                </EllipsisText>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1.5 text-sm">
                                <div className="line-clamp-1 flex gap-2 font-medium">
                                        Tổng số học viên: 50
                                </div>
                                <div className="text-muted-foreground">
                                        Tạo ngày: 25/12/2024
                                </div>
                        </CardFooter>
                </Card>
        );
}
