import React from 'react';
import { Anchor, Breadcrumbs } from '@mantine/core';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {label: string;href?: string;}

export function BreadcrumbsNav({ items }: {items: BreadcrumbItem[];}) {
  return (
    <Breadcrumbs separator="/" separatorMargin="xs" mb="lg" className="text-xs sm:text-sm">
      {items.map((item, i) => item.href ?
      <Anchor component={Link} to={item.href} key={`${item.label}-${i}`} c="emerald.7">{item.label}</Anchor> :
      <span key={`${item.label}-${i}`} className="text-gray-500">{item.label}</span>)}
    </Breadcrumbs>);

}