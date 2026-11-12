import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

export type TabDef = {
  /** Route file name in src/app ("index" is Today). */
  name: string;
  href: '/' | '/leads' | '/orders' | '/factory' | '/money';
  label: string;
  sf: { default: SFSymbol; selected: SFSymbol };
  md: AndroidSymbol;
};

export const TABS: TabDef[] = [
  { name: 'index', href: '/', label: 'Today', sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
  { name: 'leads', href: '/leads', label: 'Leads', sf: { default: 'person.2', selected: 'person.2.fill' }, md: 'group' },
  { name: 'orders', href: '/orders', label: 'Orders', sf: { default: 'shippingbox', selected: 'shippingbox.fill' }, md: 'local_shipping' },
  { name: 'factory', href: '/factory', label: 'Factory', sf: { default: 'building.2', selected: 'building.2.fill' }, md: 'factory' },
  { name: 'money', href: '/money', label: 'Money', sf: { default: 'indianrupeesign.circle', selected: 'indianrupeesign.circle.fill' }, md: 'payments' },
];
