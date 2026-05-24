import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Plus, Edit, Trash2, Star, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { storeAddress } from "../api/addressService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";

interface Address {
  id: number;
  label: string;
  street: string;
  city: string;
  postcode: string;
  country: string;
  isDefault: boolean;
}

export function Addresses() {
  const navigate = useNavigate();
  const location = useLocation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    tag: "",
    adress_line: "",
    city: "",
    postal_code: "",
    country: "Bangladesh",
    is_default_address: false,
    is_favourite_address: false
  });

  // Check if we're on the add address route
  const isAddAddressRoute = location.pathname === "/customer/dashboard/addresses/add";
  const [showAddressForm, setShowAddressForm] = useState(isAddAddressRoute);

  // Show form if on add route
  React.useEffect(() => {
    if (isAddAddressRoute && !showAddressForm) {
      setShowAddressForm(true);
    } else if (!isAddAddressRoute && showAddressForm && !editingAddress) {
      setShowAddressForm(false);
    }
  }, [isAddAddressRoute, showAddressForm, editingAddress]);

  const handleAddAddress = () => {
    navigate("/customer/dashboard/profile/addresses/add");
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      tag: address.label || "",
      adress_line: address.street || "",
      city: address.city || "",
      postal_code: address.postcode || "",
      country: address.country || "Bangladesh",
      is_default_address: address.isDefault || false,
      is_favourite_address: false
    });
    setShowAddressForm(true);
  };

  const handleDeleteAddress = (id: number) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
    toast.success("Address deleted successfully");
  };

  const handleSetDefault = (id: number) => {
    setAddresses(addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    })));
    toast.success("Default address updated");
  };

  const handleSaveAddress = async () => {
    if (!addressForm.tag || !addressForm.adress_line || !addressForm.city || !addressForm.postal_code || !addressForm.country) {
      toast.error("Please fill in all required fields");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to save address.");
      return;
    }

    setIsSubmittingAddress(true);
    try {
      const response = await storeAddress({
        api_token: token,
        tag: addressForm.tag.trim(),
        adress_line: addressForm.adress_line.trim(),
        city: addressForm.city.trim(),
        postal_code: addressForm.postal_code.trim(),
        country: addressForm.country.trim(),
        is_default_address: addressForm.is_default_address,
        is_favourite_address: addressForm.is_favourite_address
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Address saved successfully!");
        
        // Add the new address to the local state
        if (response.data) {
          const newAddress: Address = {
            id: response.data.id,
            label: response.data.tag,
            street: response.data.adress_line,
            city: response.data.city,
            postcode: response.data.postal_code,
            country: response.data.country,
            isDefault: response.data.is_default_address
          };
          
          if (editingAddress) {
            // Update existing address
            setAddresses(addresses.map(addr =>
              addr.id === editingAddress.id
                ? newAddress
                : addr
            ));
          } else {
            // Add new address
            setAddresses([...addresses, newAddress]);
          }
        }
        
        // Reset form and navigate back
        setShowAddressForm(false);
        setEditingAddress(null);
        setAddressForm({
          tag: "",
          adress_line: "",
          city: "",
          postal_code: "",
          country: "Bangladesh",
          is_default_address: false,
          is_favourite_address: false
        });
        navigate("/customer/dashboard/addresses");
      } else {
        toast.error(response.message || response.error || "Failed to save address. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while saving address. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const handleCancel = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressForm({
      tag: "",
      adress_line: "",
      city: "",
      postal_code: "",
      country: "Bangladesh",
      is_default_address: false,
      is_favourite_address: false
    });
    navigate("/customer/dashboard/addresses");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">My Addresses</h1>
          <p className="text-gray-600 text-sm md:text-base">
            Manage your saved addresses for easy booking and delivery
          </p>
        </div>
        {!showAddressForm && (
          <Button
            onClick={handleAddAddress}
            className="bg-red-600 hover:bg-red-700 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Address
          </Button>
        )}
      </div>

      {/* Inline Address Form */}
      {showAddressForm && (
        <Card className="border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#0A1A2F]">
                {editingAddress ? "Edit Address" : "Add New Address"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveAddress(); }} className="space-y-4">
              <div>
                <Label htmlFor="address-tag">Address Label (Tag) *</Label>
                <Input
                  id="address-tag"
                  value={addressForm.tag}
                  onChange={(e) => setAddressForm({ ...addressForm, tag: e.target.value })}
                  placeholder="e.g., Home, Office, Warehouse"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address-line">Address Line *</Label>
                <Input
                  id="address-line"
                  value={addressForm.adress_line}
                  onChange={(e) => setAddressForm({ ...addressForm, adress_line: e.target.value })}
                  placeholder="e.g., Rampura"
                  className="mt-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address-city">City *</Label>
                  <Input
                    id="address-city"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="e.g., Dhaka"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address-postal-code">Postal Code *</Label>
                  <Input
                    id="address-postal-code"
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                    placeholder="e.g., 1205"
                    className="mt-2"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address-country">Country *</Label>
                <Input
                  id="address-country"
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  placeholder="e.g., Bangladesh"
                  className="mt-2"
                  required
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-default-address"
                    checked={addressForm.is_default_address}
                    onChange={(e) => setAddressForm({ ...addressForm, is_default_address: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <Label htmlFor="is-default-address" className="font-normal cursor-pointer">
                    Set as default address
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-favourite-address"
                    checked={addressForm.is_favourite_address}
                    onChange={(e) => setAddressForm({ ...addressForm, is_favourite_address: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <Label htmlFor="is-favourite-address" className="font-normal cursor-pointer">
                    Mark as favourite
                  </Label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmittingAddress}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 flex-1"
                  disabled={isSubmittingAddress}
                >
                  {isSubmittingAddress ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingAddress ? "Update Address" : "Save Address"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Addresses List */}
      <Card>
        <CardContent className="p-6">
          {addresses.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2 text-gray-600">No addresses found</p>
              <p className="text-sm text-gray-500 mb-4">Your saved addresses will appear here</p>
              <Button
                variant="outline"
                onClick={handleAddAddress}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Address
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{address.label}</p>
                      {address.isDefault && (
                        <Badge className="bg-green-100 text-green-700">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{address.street}</p>
                    <p className="text-sm text-gray-600">
                      {address.city}, {address.postcode}
                    </p>
                    <p className="text-sm text-gray-500">{address.country}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAddress(address)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!address.isDefault && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(address.id)}
                          title="Set as default"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAddress(address.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
