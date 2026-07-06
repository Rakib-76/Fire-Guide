import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, MapPin, Search } from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useApp } from "../contexts/AppContext";
import {
  convertRadiusToKm,
  filterProfessionalsByQuestionnaire,
  milesFromRadiusSelection,
} from "../lib/filterProfessionalsByQuestionnaire";
import { useNominatimGeocode } from "../hooks/useNominatimGeocode";
import { PostcodePreviewMap, radiusValueToMeters } from "./PostcodePreviewMap";
// selected_services/store is called only when "Book Now" is clicked on Compare Professionals page (with professional_id)

interface LocationPageProps {
  serviceId: number;
  questionnaireData: {
    property_type_id: number;
    approximate_people_id: number;
    number_of_floors: string;
    number_of_floors_id?: number;
    duration_id?: number;
    preferred_date: string;
    access_note: string;
  } | null;
  onContinue: () => void;
  onBack: () => void;
  /** Called when store succeeds, with the created selected_service id and location data (for store call on Book Now with professional_id) */
  onStoreSuccess?: (
    selectedServiceId: number,
    locationData: { post_code: string; search_radius: string; miles: number; service_id: number }
  ) => void;
}

export function LocationPage({ serviceId, questionnaireData, onContinue, onBack, onStoreSuccess }: LocationPageProps) {
  const { setFilteredProfessionalsFromFra } = useApp();
  const [postcode, setPostcode] = useState("");
  const [selectedRadius, setSelectedRadius] = useState("10mi");
  const [error, setError] = useState<string | null>(null);
  const { status: geocodeStatus, result: geocodeResult } = useNominatimGeocode(postcode);

  const radiusOptions = [
    { value: "5mi", label: "5 miles" },
    { value: "10mi", label: "10 miles" },
    { value: "15mi", label: "15 miles" },
    { value: "25mi", label: "25 miles" },
    { value: "entire", label: "Entire region" }
  ];

  const isValid = postcode.trim().length > 0;

  // Convert radius to "8km" / "entire" string for session + Book / selected-service APIs (not sent on filter-professional).
  const convertRadiusToKmLocal = convertRadiusToKm;

  /** Numeric miles for API fields such as Laravel `miles` validation on filter-professional. */
  const milesFromRadiusSelectionLocal = milesFromRadiusSelection;

  const handleFindProfessionals = async () => {
    if (!isValid || !questionnaireData) {
      return;
    }
    setError(null);
    const searchRadius = convertRadiusToKmLocal(selectedRadius);
    const miles = milesFromRadiusSelectionLocal(selectedRadius);
    const locationData = {
      post_code: postcode.trim(),
      search_radius: searchRadius,
      miles,
      service_id: serviceId,
    };
    try {
      const professionals = await filterProfessionalsByQuestionnaire({
        serviceId,
        questionnaireData: questionnaireData as Record<string, unknown>,
        location: {
          post_code: postcode.trim(),
          miles,
        },
      });
      setFilteredProfessionalsFromFra(professionals);
    } catch (e) {
      console.error("Filter professionals failed:", e);
      setFilteredProfessionalsFromFra(null);
    }
    if (onStoreSuccess) {
      onStoreSuccess(0, locationData);
    } else {
      onContinue();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header — same logo bar as main nav / other booking steps */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm text-[#0A1A2F] py-3 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link
            to="/"
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-gray-50 py-4 px-4 md:px-6 border-b">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <a href="/" className="hover:text-red-600 transition-colors">Home</a>
            <ChevronRight className="w-4 h-4" />
            <a href="/services" className="hover:text-red-600 transition-colors">Select Service</a>
            <ChevronRight className="w-4 h-4" />
            <a href="#" className="hover:text-red-600 transition-colors">Details</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Location</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-12 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-[#0A1A2F]">
                Where do you need the service?
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Enter your postcode to find qualified professionals near you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Left Column - Inputs */}
            <div className="space-y-8">
              {/* Postcode Input */}
              <div className="space-y-3">
                <Label htmlFor="postcode" className="text-base">Your postcode</Label>
                <div className="relative">
                  <Input
                    id="postcode"
                    type="text"
                    placeholder="e.g. SW1A 1AA"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    className="text-lg pr-12"
                  />
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Radius Selection */}
              {/* <div className="space-y-3">
                <Label className="text-base">Search radius</Label>
                <div className="flex flex-wrap gap-3">
                  {radiusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedRadius(option.value)}
                      className={`px-6 py-3 rounded-lg border-2 transition-all ${
                        selectedRadius === option.value
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-white border-gray-300 text-gray-700 hover:border-red-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  {selectedRadius === "entire" 
                    ? "We'll search across the entire region" 
                    : `We'll search within ${radiusOptions.find(o => o.value === selectedRadius)?.label} of your postcode`
                  }
                </p>
              </div> */}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Find Button */}
              <Button
                type="button"
                disabled={!isValid || !questionnaireData}
                className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleFindProfessionals}
              >
                <Search className="w-5 h-5 mr-2" />
                Find Professionals
              </Button>
            </div>

            {/* Right column — React Leaflet map (geocoded from postcode / town via Nominatim) */}
            <div className="rounded-lg overflow-hidden border-2 border-gray-200 h-[450px] relative bg-gray-100">
              <PostcodePreviewMap
                geocodeStatus={geocodeStatus}
                geocode={geocodeResult}
                radiusMeters={radiusValueToMeters(selectedRadius)}
              />
              {postcode.trim().length < 2 && (
                <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col items-center justify-center bg-gray-100/85 text-center p-6">
                  <MapPin className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-600 text-sm max-w-[220px]">
                    Enter a postcode or place name to preview it on the map
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Don't know your postcode?</span> You can enter your town or city name and we'll help you find it.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}