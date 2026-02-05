import { ComponentProps } from 'react';

interface LogoProps extends Omit<ComponentProps<'a'>, 'href'> {
  width?: number;
  height?: number;
  textClassName?: string;
  href?: string;
}

export default function Logo({ 
  className = "", 
  width = 80, 
  height = 80,
  textClassName = "text-white text-3xl font-semibold",
  href = "/",
  ...props
}: LogoProps) {
  return (
    <a href={href} className={`flex items-center gap-1 ${className}`} {...props}>
      <img src="/favicon.png" alt="Logo" width={width} height={height} className="object-contain" />
      <span className={textClassName}>ifound</span>
    </a>
  );
}
