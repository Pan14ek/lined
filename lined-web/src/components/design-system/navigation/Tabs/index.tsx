import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from '@/components/ui/tabs';

/**
 * Purpose: canonical tabbed navigation within a page or panel.
 *
 * When to use: switching between a small number of related views without navigating away.
 *
 * When not to use: top-level app navigation — use routed links/`Sidebar`.
 */
export const Tabs = TabsPrimitive;
export const TabsList = TabsListPrimitive;
export const TabsTrigger = TabsTriggerPrimitive;
export const TabsContent = TabsContentPrimitive;
