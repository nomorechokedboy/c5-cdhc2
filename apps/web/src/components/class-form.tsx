import { useAppForm } from '@/hooks/demo.form';
import {
        Dialog,
        DialogHeader,
        DialogTrigger,
        DialogContent,
        DialogTitle,
        DialogClose,
        DialogFooter,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { CreateClass } from '@/api';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Class, ClassBody } from '@/types';

const schema = z.object({
        name: z.string().min(1, 'Tên lớp không được bỏ trống'),
        description: z.string(),
});

export interface ClassFormProps {
        onSuccess: (
                data: Class[],
                variables: ClassBody,
                context: unknown
        ) => unknown;
}

export default function ClassForm({ onSuccess }: ClassFormProps) {
        const { mutateAsync } = useMutation({
                mutationFn: CreateClass,
                onSuccess,
                onError: (error) => {
                        console.error('Failed to create class:', error);
                },
        });
        const form = useAppForm({
                defaultValues: {
                        name: '',
                        description: '',
                },
                onSubmit: async ({ value }: { value: any }) => {
                        try {
                                await mutateAsync(value);
                                alert('Form submitted successfully!');
                        } catch (err) {
                                console.error(err);
                                alert('Form submitted failed!');
                        } finally {
                                setOpen(false);
                        }
                },
                validators: {
                        onBlur: schema,
                },
        });
        const [open, setOpen] = useState(false);

        return (
                <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                                <Button>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Thêm lớp
                                </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                        <DialogTitle>
                                                Biểu mẫu tạo lớp
                                        </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                        <form
                                                className="space-y-4"
                                                onSubmit={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        form.handleSubmit();
                                                }}
                                        >
                                                <div className="space-y-2">
                                                        <form.AppField name="name">
                                                                {(
                                                                        field: any
                                                                ) => (
                                                                        <field.TextField label="Tên lớp" />
                                                                )}
                                                        </form.AppField>
                                                </div>

                                                <div className="space-y-2">
                                                        <form.AppField name="description">
                                                                {(
                                                                        field: any
                                                                ) => (
                                                                        <field.TextArea label="Description" />
                                                                )}
                                                        </form.AppField>
                                                </div>

                                                <DialogFooter>
                                                        <DialogClose asChild>
                                                                <Button variant="outline">
                                                                        Cancel
                                                                </Button>
                                                        </DialogClose>

                                                        <form.AppForm>
                                                                <form.SubscribeButton label="Submit" />
                                                        </form.AppForm>
                                                </DialogFooter>
                                        </form>
                                </div>
                        </DialogContent>
                </Dialog>
        );
}
