import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import type { AppRole } from '@/lib/database.types';

export type TabDef = {
  /** Route name inside src/app/(tabs) ("index" is Today, "more" is a folder). */
  name: string;
  href: '/' | '/leads' | '/orders' | '/factory' | '/money' | '/more';
  label: string;
  sf: { default: SFSymbol; selected: SFSymbol };
  md: AndroidSymbol;
  /** Roles that see this tab. */
  roles: AppRole[];
};

const ALL: AppRole[] = ['owner', 'sales', 'despatch', 'factory'];

export const TABS: TabDef[] = [
  { name: 'index', href: '/', label: 'Today', sf: { default: 'house', selected: 'house.fill' }, md: 'home', roles: ALL },
  { name: 'leads', href: '/leads', label: 'Leads', sf: { default: 'person.2', selected: 'person.2.fill' }, md: 'group', roles: ['owner', 'sales'] },
  { name: 'orders', href: '/orders', label: 'Orders', sf: { default: 'shippingbox', selected: 'shippingbox.fill' }, md: 'local_shipping', roles: ['owner', 'sales', 'despatch'] },
  { name: 'factory', href: '/factory', label: 'Factory', sf: { default: 'building.2', selected: 'building.2.fill' }, md: 'factory', roles: ['owner', 'factory'] },
  { name: 'money', href: '/money', label: 'Money', sf: { default: 'indianrupeesign.circle', selected: 'indianrupeesign.circle.fill' }, md: 'payments', roles: ['owner'] },
  { name: 'more', href: '/more', label: 'More', sf: { default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }, md: 'more_horiz', roles: ALL },
];

export function tabsFor(role: AppRole | null) {
  return TABS.filter((t) => role != null && t.roles.includes(role));
}
