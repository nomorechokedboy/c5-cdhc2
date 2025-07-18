export default function MilitaryStep({ form }: { form: any }) {
        return (
                <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center mb-8">
                                Military Information
                        </h2>

                        {/* Enlistment Period and Position - Two Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <form.AppField name="enlistmentPeriod">
                                        {(field: any) => (
                                                <field.TextField label="Ngày nhập ngũ" />
                                        )}
                                </form.AppField>

                                <form.AppField name="position">
                                        {(field: any) => (
                                                <field.TextField label="Chức vụ" />
                                        )}
                                </form.AppField>
                        </div>

                        {/* Previous Unit - Full Width */}
                        <div className="grid grid-cols-1 gap-6">
                                <form.AppField name="previousUnit">
                                        {(field: any) => (
                                                <field.TextField label="Đơn vị cũ" />
                                        )}
                                </form.AppField>
                        </div>

                        {/* Previous Position - Full Width */}
                        <div className="grid grid-cols-1 gap-6">
                                <form.AppField name="previousPosition">
                                        {(field: any) => (
                                                <field.TextField label="Chức vụ công tác tại đơn vị cũ" />
                                        )}
                                </form.AppField>
                        </div>

                        {/* Policy Beneficiary Group - Full Width */}
                        <div className="grid grid-cols-1 gap-6">
                                <form.AppField name="policyBeneficiaryGroup">
                                        {(field: any) => (
                                                <field.TextField label="Diện chính sách" />
                                        )}
                                </form.AppField>
                        </div>
                </div>
        );
}
