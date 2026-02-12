"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";

type SidebarContext = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
};

const SidebarContext = React.createContext<SidebarContext | null>(null);

function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = true,
      open: controlledOpen,
      onOpenChange,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const [openMobile, setOpenMobile] = React.useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = React.useCallback(
      (value: boolean) => {
        if (onOpenChange) onOpenChange(value);
        else setUncontrolledOpen(value);
      },
      [onOpenChange]
    );
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
      const mq = window.matchMedia("(max-width: 768px)");
      setIsMobile(mq.matches);
      const fn = () => setIsMobile(mq.matches);
      mq.addEventListener("change", fn);
      return () => mq.removeEventListener("change", fn);
    }, []);
    const value = React.useMemo(
      () => ({
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
      }),
      [open, setOpen, openMobile, isMobile]
    );
    return (
      <SidebarContext.Provider value={value}>
        <div
          ref={ref}
          className={cn("flex min-h-svh w-full", className)}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
              ...style,
            } as React.CSSProperties
          }
          {...props}
        />
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { side?: "left" | "right" }
>(({ className, side = "left", children, ...props }, ref) => {
  const { openMobile, setOpenMobile, isMobile } = useSidebar();
  const content = (
    <div
      ref={ref}
      data-side={side}
      className={cn(
        "flex h-svh w-[var(--sidebar-width-mobile)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        isMobile &&
          "fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width-mobile)] transition-transform duration-200 ease-linear",
        isMobile && side === "left" && "-translate-x-full",
        isMobile && openMobile && "translate-x-0",
        !isMobile && "md:w-[var(--sidebar-width)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
  if (isMobile) {
    return (
      <>
        {openMobile && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-hidden
            onClick={() => setOpenMobile(false)}
          />
        )}
        {content}
      </>
    );
  }
  return content;
});
Sidebar.displayName = "Sidebar";

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="header"
    className={cn("flex flex-col gap-2 p-2", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="content"
    className={cn("flex-1 overflow-auto py-2", className)}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="footer"
    className={cn("flex flex-col gap-2 border-t border-sidebar-border p-2", className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group"
    className={cn("relative flex w-full flex-col p-2", className)}
    {...props}
  />
));
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-label"
    className={cn(
      "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70",
      className
    )}
    {...props}
  />
));
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("flex flex-col gap-1", className)}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full flex-col gap-1", className)}
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("list-none", className)}
    {...props}
  />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
  }
>(({ className, asChild, isActive, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn("flex-1 overflow-auto", className)}
    {...props}
  />
));
SidebarInset.displayName = "SidebarInset";

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, onClick, ...props }, ref) => {
  const { isMobile, openMobile, setOpenMobile, setOpen } = useSidebar();
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isMobile) setOpenMobile(!openMobile);
    else setOpen?.(false);
    onClick?.(e);
  };
  return (
    <button
      ref={ref}
      data-sidebar="trigger"
      type="button"
      aria-label="Toggle sidebar"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="rtl:rotate-180"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
    </button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
