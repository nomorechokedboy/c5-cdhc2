export default function FamilyStep({ form }: { form: any }) {
        return (
                <div className="space-y-8">
                        {/* Father Information */}
                        <div className="space-y-6">
                                <h3 className="text-lg font-semibold border-b border-border pb-2">
                                        Thông tin về cha
                                </h3>

                                {/* Father Name and Phone - Two Columns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <form.AppField name="fatherName">
                                                {(field: any) => (
                                                        <field.TextField label="Tên cha" />
                                                )}
                                        </form.AppField>

                                        <form.AppField name="fatherPhoneNumber">
                                                {(field: any) => (
                                                        <field.TextField label="Số điện thoại cha" />
                                                )}
                                        </form.AppField>
                                </div>

                                {/* Father Job - Full Width */}
                                <div className="grid grid-cols-2 gap-6">
                                        <form.AppField name="fatherJob">
                                                {(field: any) => (
                                                        <field.TextField label="Nghề nghiệp cha" />
                                                )}
                                        </form.AppField>
                                        <form.AppField name="fatherJobAddress">
                                                {(field: any) => (
                                                        <field.TextField label="Địa chỉ công việc cha" />
                                                )}
                                        </form.AppField>
                                </div>
                        </div>

                        {/* Mother Information */}
                        <div className="space-y-6">
                                <h3 className="text-lg font-semibold border-b border-border pb-2">
                                        Thông tin về mẹ
                                </h3>

                                {/* Mother Name and Phone - Two Columns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <form.AppField name="motherName">
                                                {(field: any) => (
                                                        <field.TextField label="Tên mẹ" />
                                                )}
                                        </form.AppField>

                                        <form.AppField name="motherPhoneNumber">
                                                {(field: any) => (
                                                        <field.TextField label="Số điện thoại mẹ" />
                                                )}
                                        </form.AppField>
                                </div>

                                {/* Mother Job - Full Width */}
                                <div className="grid grid-cols-2 gap-6">
                                        <form.AppField name="motherJob">
                                                {(field: any) => (
                                                        <field.TextField label="Nghề nghiệp mẹ" />
                                                )}
                                        </form.AppField>
                                        <form.AppField name="motherJobAddress">
                                                {(field: any) => (
                                                        <field.TextField label="Địa chỉ công việc mẹ" />
                                                )}
                                        </form.AppField>
                                </div>
                        </div>
                </div>
        );
}
