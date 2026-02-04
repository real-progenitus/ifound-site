import { ComponentProps } from 'react';

interface LogoProps extends Omit<ComponentProps<'a'>, 'href'> {
  width?: number;
  height?: number;
  textClassName?: string;
  href?: string;
}

export default function Logo({ 
  className = "", 
  width = 95, 
  height = 95,
  textClassName = "text-white text-3xl font-semibold -ml-5 translate-y-4",
  href = "/",
  ...props
}: LogoProps) {
  return (
    <a href={href} className={`flex items-start gap-0 ${className}`} {...props}>
      <img src="/logopin.png" alt="Logo" width={width} height={height} className="object-contain" />
      <span className={textClassName}>ifound</span>
    </a>
  );
}
