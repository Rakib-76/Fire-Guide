import { LucideIcon, ArrowRight, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import "./ServiceCard.css";

export interface Service {
  id: number;
  name: string;
  icon?: string;
  iconComponent?: LucideIcon;
  description: string;
  basePrice: string;
  popular?: boolean;
  active?: boolean;
  category?: string;
  color?: string;
}

interface ServiceCardProps {
  service: Service;
  variant?: "default" | "admin" | "customer" | "professional" | "landing";
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onClick?: () => void;
  showActions?: boolean;
}

const colorClasses = {
  red: "bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white",
  blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
  green: "bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white",
  purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
};

const landingThemeClasses = {
  red: "service-card-landing--red",
  blue: "service-card-landing--blue",
  green: "service-card-landing--green",
  purple: "service-card-landing--purple",
  orange: "service-card-landing--orange",
} as const;

function formatLandingPrice(basePrice: string): string {
  return basePrice.replace(/\.00$/, "");
}

type ServiceColor = keyof typeof colorClasses;

function getServiceColor(service: Service): ServiceColor {
  if (service.color && service.color in colorClasses) {
    return service.color as ServiceColor;
  }
  return "red";
}

export function ServiceCard({
  service,
  variant = "default",
  onEdit,
  onDelete,
  onClick,
  showActions = true
}: ServiceCardProps) {
  const serviceColor = getServiceColor(service);
  const isClickable = variant !== "admin" && onClick;
  const isAdmin = variant === "admin";
  const isLanding = variant === "landing";

  if (isLanding) {
    const Icon = service.iconComponent;
    const themeClass = landingThemeClasses[serviceColor];

    return (
      <button
        type="button"
        onClick={onClick}
        className={`service-card-landing ${themeClass} ${
          service.active === false ? "service-card-landing--inactive" : ""
        }`}
      >
        <div className="service-card-landing__top">
          {Icon ? (
            <div className="service-card-landing__icon-wrap">
              <Icon className="service-card-landing__icon" strokeWidth={2} />
            </div>
          ) : service.icon ? (
            <span className="text-xl leading-none">{service.icon}</span>
          ) : null}
          <h3 className="service-card-landing__title">{service.name}</h3>
        </div>

        <p className="service-card-landing__description">{service.description}</p>

        <div className="service-card-landing__footer">
          <p
            className={`service-card-landing__price ${
              service.active === false ? "service-card-landing__price--muted" : ""
            }`}
          >
            From {formatLandingPrice(service.basePrice)}
          </p>
          <ArrowRight className="service-card-landing__arrow" strokeWidth={2.25} />
        </div>
      </button>
    );
  }

  return (
    <Card
      onClick={isClickable ? onClick : undefined}
      className={`
        border-2 border-transparent rounded-xl transition-all duration-300 ease-out
        ${isClickable ? "cursor-pointer hover:shadow-xl hover:border-red-100 group hover:-translate-y-1 hover:scale-[1.01] shadow-md" : "shadow-md"}
        transform-gpu
      `}
      style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transform: 'translateZ(0)'
      }}
    >
      {/* Card Header — admin: stack actions below title on mobile for touch targets */}
      <CardHeader className="p-3 pb-3 md:p-4 md:pb-3">
        {isAdmin ? (
          <div className="flex gap-3 items-start min-w-0">
            {service.iconComponent && (
              <div
                className={`w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  colorClasses[serviceColor]
                }`}
              >
                <service.iconComponent className="w-6 h-6 md:w-7 md:h-7" />
              </div>
            )}
            {service.icon && !service.iconComponent && (
              <span className="text-3xl leading-none flex-shrink-0">{service.icon}</span>
            )}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold leading-snug text-[#0A1A2F] break-words">
                {service.name}
              </CardTitle>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {service.iconComponent && (
              <div
                className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  colorClasses[serviceColor]
                }`}
              >
                <service.iconComponent className="w-7 h-7" />
              </div>
            )}
            {service.icon && !service.iconComponent && (
              <span className="text-3xl leading-none flex-shrink-0">{service.icon}</span>
            )}

            <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle
                  className={`text-base font-semibold leading-tight truncate ${
                    isClickable ? "group-hover:text-red-600 transition-colors" : "text-[#0A1A2F]"
                  }`}
                  title={service.name}
                >
                  {service.name}
                </CardTitle>

                {!isAdmin && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {service.active === true && (
                      <Badge className="bg-green-600 text-white text-xs px-2 py-1 rounded-lg h-6">
                        Active
                      </Badge>
                    )}
                    {service.active === false && (
                      <Badge className=" text-white text-xs px-2 py-1 rounded-lg h-6">
                        Inactive
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Card content — match header padding on small screens */}
      <CardContent className="px-3 pb-4 md:px-4">
        <div className="space-y-3">
          {/* Description - 12px font, gray-600 color */}
          <p className="text-xs text-gray-600 leading-relaxed">
            {service.description}
          </p>

          {/* Price row — admin: edit/delete on the right of the price */}
          <div className="flex items-end justify-between gap-3 pt-1">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1">Starting from</p>
              <p className={`text-base font-bold leading-none ${
                service.active === false ? "text-gray-400" : "text-red-600"
              }`}>
                {service.basePrice}
              </p>
            </div>

            {isAdmin && showActions && (onEdit || onDelete) ? (
              <div className="flex gap-2 shrink-0 items-center">
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(service.id);
                    }}
                    className="h-9 px-3 text-xs bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(service.id);
                    }}
                    className="h-9 px-3 text-xs bg-white border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            ) : service.category ? (
              <Badge variant="outline" className="text-xs px-2 py-1 rounded-lg h-6 shrink-0">
                {service.category}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
