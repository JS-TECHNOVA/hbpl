'use client';

import React from 'react';
import { Phone } from 'lucide-react';

const PhoneButton: React.FC = () => {
  const phoneNumber = '+916388735208';
  const telLink = `tel:${phoneNumber}`;

  return (
    <a
      href={telLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
      aria-label="Call us on phone"
    >
      <Phone 
        size={24} 
        className="group-hover:rotate-12 transition-transform duration-300"
      />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
        <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
          Call Us: +91 6388735208
          <div className="absolute top-full left-4 -mt-1">
            <div className="border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      </div>

      {/* Pulse animation for attention */}
      <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></span>
    </a>
  );
};

export default PhoneButton;
