"use client";

import * as React from "react";
import { disableClarityTracking } from "@/utils/clarityPrivacy";

type ClarityExitLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

const ClarityExitLink = React.forwardRef<HTMLAnchorElement, ClarityExitLinkProps>(
  ({ onClick, ...props }, ref) => {
    return (
      <a
        ref={ref}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            disableClarityTracking();
          }
        }}
        {...props}
      />
    );
  }
);

ClarityExitLink.displayName = "ClarityExitLink";

export default ClarityExitLink;
