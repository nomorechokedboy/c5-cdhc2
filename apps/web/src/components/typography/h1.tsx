import { JSX } from 'react';

export default function TypographyH1({
        className,
        ...props
}: JSX.IntrinsicElements['h1']) {
        return (
                <h1
                        className={`scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance ${className}`}
                        {...props}
                />
        );
}
