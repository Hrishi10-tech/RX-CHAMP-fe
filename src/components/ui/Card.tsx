import { createElement, forwardRef, type HTMLAttributes } from "react";

import { cardBase } from "@/components/ui/classes";
import { cn } from "@/components/ui/cn";

type CardTag = "div" | "section" | "article" | "aside" | "li" | "form" | "header" | "ul";

export type CardProps = HTMLAttributes<HTMLElement> & {
  /** The element to draw (a section, a form, a list item); a div by default. */
  as?: CardTag;
  /** Form attributes, when the card is a form. */
  noValidate?: boolean;
};

/** A card: the card colour, the card border, radius 16 (the agent's Border.card). */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { as = "div", className, ...rest },
  ref,
) {
  return createElement(as as string, { ref, className: cn(cardBase, className), ...rest });
});
