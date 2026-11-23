import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import {
  checkboxBase,
  errorText,
  hintBase,
  inputBase,
  inputInvalid,
  labelBase,
  textareaBase,
} from "@/components/ui/classes";
import { cn } from "@/components/ui/cn";

/**
 * Form fields in the agent's field style: the field colour with the card border, teal on focus,
 * amber when the value needs a look (D-88, D-89). Refs are forwarded (react-hook-form registers by ref).
 */
export type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || rest["aria-invalid"] ? true : undefined}
      className={cn(inputBase, invalid && inputInvalid, className)}
      {...rest}
    />
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || rest["aria-invalid"] ? true : undefined}
      className={cn(textareaBase, invalid && inputInvalid, className)}
      {...rest}
    />
  );
});

export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function Checkbox({ className, ...rest }, ref) {
  return <input ref={ref} type="checkbox" className={cn(checkboxBase, className)} {...rest} />;
});

/** A field's label. */
export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn(labelBase, className)} {...rest} />;
}

/** The quiet line under a field that explains it; with `error`, it says what is wrong instead, in amber. */
export function Hint({
  error,
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement> & { error?: unknown }) {
  return <p className={cn(error ? errorText : hintBase, className)} {...rest} />;
}

/** What is wrong with a field, in amber (there is no red). */
export function FieldError({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(errorText, className)} {...rest} />;
}
