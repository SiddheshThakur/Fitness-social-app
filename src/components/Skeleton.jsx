import React from 'react';

const Skeleton = ({ 
  width = '100%', 
  height = '16px', 
  circle = false, 
  rounded = 'rounded',
  className = '' 
}) => {
  return (
    <div 
      className={`animate-pulse bg-gray-200 ${circle ? 'rounded-full' : rounded} ${className}`}
      style={{ width, height }}
    />
  );
};

export default Skeleton;
