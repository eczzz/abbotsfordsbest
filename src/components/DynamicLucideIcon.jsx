import React from 'react';
import * as LucideIcons from 'lucide-react';

const DynamicLucideIcon = ({ iconName, className = "w-6 h-6", ...props }) => {
  // Get the icon component from lucide-react
  const IconComponent = LucideIcons[iconName];
  
  // If the icon doesn't exist, fall back to Building icon
  const FallbackIcon = LucideIcons.Building;
  
  // Use the requested icon if it exists, otherwise use fallback
  const Icon = IconComponent || FallbackIcon;
  
  return <Icon className={className} {...props} />;
};

export default DynamicLucideIcon;