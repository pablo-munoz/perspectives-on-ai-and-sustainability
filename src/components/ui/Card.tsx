import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "glass";
}

export function Card({
  className,
  variant = "default",
  ...rest
}: CardProps) {
  const variantClass =
    variant === "glass"
      ? "card-glass"
      : variant === "elevated"
      ? "card-elevated"
      : "card";
  return <div className={cn(variantClass, className)} {...rest} />;
}

export function CardHeader({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-4 pt-4 pb-2 flex items-center justify-between", className)}
      {...rest}
    />
  );
}

export function CardBody({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4", className)} {...rest} />;
}
