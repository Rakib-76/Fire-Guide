import React from "react";
import type { BookingData } from "./BookingFlow";

export function BookingServiceDetailsLines({ service }: { service: BookingData["service"] }) {
  if (service.details.length > 0) {
    return (
      <div className="space-y-1 text-sm text-gray-600">
        {service.details.map((row) => (
          <p key={row.label}>
            {row.label}: <span className="text-gray-900">{row.value}</span>
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm text-gray-600">
      <p>
        Property Type: <span className="text-gray-900">{service.propertyType}</span>
      </p>
      <p>
        Number of Floors: <span className="text-gray-900">{service.floors}</span>
      </p>
      <p>
        Number of People: <span className="text-gray-900">{service.people}</span>
      </p>
    </div>
  );
}
