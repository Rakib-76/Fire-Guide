import React, { useState, useEffect, startTransition, useRef } from "react";
import { 
  User, 
  Save,
  CheckCircle2,
  Circle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  FileText,
  Award,
  Shield,
  Info,
  Upload,
  CheckSquare,
  Clock,
  XCircle,
  X,
  Eye,
  Loader2
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { fetchServices, ServiceResponse, formatServiceFromPrice } from "../api/servicesService";
import { uploadProfileImage, UploadProfileImageRequest } from "../api/authService";
import {
  getApiToken,
  getProfessionalId,
  setProfessionalId,
  getUserEmail,
  getUserFullName,
  getUserPhone,
} from "../lib/auth";
import { createCertification } from "../api/qualificationsService";
import { prepareCertificationEvidence } from "../lib/certificationEvidence";
import { createProfessional, CreateProfessionalRequest, CreateProfessionalServiceItem, fetchProfessionalFromListById, getProfessionalProfileImageUrl, getSelectedServices, getProfileCompletionPercentage, ProfileCompletionDetails, getCertificates, CertificateItem, getProfessionalExperiences, createProfessionalExperience, ExperienceItem, parseProfessionalServiceRadiusMiles } from "../api/professionalsService";
import { toast } from "sonner";
import {
  readCompleteProfileReminderFlag,
  clearCompleteProfileReminderFlag,
  shouldShowNewProfessionalOnboarding,
  isProfileFullyComplete,
} from "../lib/professionalProfileReminder";
import { resolveAndStoreProfessionalId } from "../lib/resolveProfessionalId";

/** API expects plain numeric strings e.g. `"100"`, not `£100.00`. */
function formatServicePriceForApi(raw: string | number | null | undefined): string {
  if (raw == null || raw === "") return "0";
  const cleaned = String(raw).trim().replace(/^£\s*/, "");
  const n = Number.parseFloat(cleaned);
  if (Number.isFinite(n)) {
    return Number.isInteger(n) ? String(n) : String(n);
  }
  return cleaned || "0";
}

/** Pre-fill from signup/login session (localStorage) — same fields the user entered at registration. */
function readAuthContactDefaults() {
  return {
    name: (getUserFullName() ?? "").trim(),
    email: (getUserEmail() ?? "").trim(),
    phone: (getUserPhone() ?? "").trim(),
  };
}

/** Intro modal only after first-time signup redirect (session flag), not returning login. */
function computeShowProfileOnboardingReminder(): boolean {
  return shouldShowNewProfessionalOnboarding();
}

export function ProfessionalProfileContent() {
  const [formData, setFormData] = useState(() => {
    const d = readAuthContactDefaults();
    return {
      name: d.name,
      email: d.email,
      phone: d.phone,
      businessName: "",
      address: "",
      postcode: "",
      responseTime: "",
      bio: "",
      serviceRadius: [50],
      emergencyCallout: true,
    };
  });

  // If auth keys were written after first paint, merge once into empty fields only
  useEffect(() => {
    setFormData((prev) => {
      const d = readAuthContactDefaults();
      return {
        ...prev,
        name: prev.name.trim() ? prev.name : d.name,
        email: prev.email.trim() ? prev.email : d.email,
        phone: prev.phone.trim() ? prev.phone : d.phone,
      };
    });
  }, []);

  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedServiceStatuses, setSelectedServiceStatuses] = useState<Record<number, string>>({});
  const [selectedServiceMeta, setSelectedServiceMeta] = useState<
    Record<number, { price?: string; service_area?: string }>
  >({});
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [loadingProfessional, setLoadingProfessional] = useState(false);
  
  // Profile completion data from API
  const [profileCompletionDetails, setProfileCompletionDetails] = useState<ProfileCompletionDetails | null>(null);
  const [profileCompletionPercentage, setProfileCompletionPercentage] = useState<number>(0);
  
  // Certificates from API
  const [certifications, setCertifications] = useState<CertificateItem[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false); // Track if we've attempted to fetch data (i.e., professional_id exists)
  
  // Experiences from API
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(false);
  const [hasAttemptedFetchExperiences, setHasAttemptedFetchExperiences] = useState(false);
  
  // Profile image upload states
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Preview before upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref to track if component is mounted (prevents state updates after unmount)
  const reloadProfileImageRef = useRef(true);

  // Certification form states
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [certificationFormData, setCertificationFormData] = useState({
    certificate_name: "",
    description: "",
    evidence: "",
    status: "pending"
  });
  const [selectedCertificationFile, setSelectedCertificationFile] = useState<File | null>(null);
  const [isSubmittingCertification, setIsSubmittingCertification] = useState(false);
  const certificationFileInputRef = useRef<HTMLInputElement>(null);
  
  // State for viewing certification details in modal
  const [isCertificationModalOpen, setIsCertificationModalOpen] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<CertificateItem | null>(null);

  // Experience form states
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [experienceFormData, setExperienceFormData] = useState({
    experience_name: "",
    description: "",
    evidence: "",
    status: "pending"
  });
  const [selectedExperienceFile, setSelectedExperienceFile] = useState<File | null>(null);
  const [isSubmittingExperience, setIsSubmittingExperience] = useState(false);
  const experienceFileInputRef = useRef<HTMLInputElement>(null);
  
  // State for viewing experience details in modal
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceItem | null>(null);

  const [showCompleteProfileReminder, setShowCompleteProfileReminder] = useState(computeShowProfileOnboardingReminder);

  /** Shown first after signup redirect; hidden after save or when profile completion reaches 100%. */
  const [completeProfileIntroModalOpen, setCompleteProfileIntroModalOpen] = useState(computeShowProfileOnboardingReminder);
  const [introModalDismissedByUser, setIntroModalDismissedByUser] = useState(false);

  const syncOnboardingVisibility = (completionPct: number) => {
    if (isProfileFullyComplete(completionPct)) {
      clearCompleteProfileReminderFlag();
      setShowCompleteProfileReminder(false);
      setCompleteProfileIntroModalOpen(false);
      setIntroModalDismissedByUser(false);
      return;
    }
    const show = shouldShowNewProfessionalOnboarding(completionPct);
    setShowCompleteProfileReminder(show);
    setCompleteProfileIntroModalOpen(show && !introModalDismissedByUser);
  };

  useEffect(() => {
    if (!readCompleteProfileReminderFlag()) {
      setShowCompleteProfileReminder(false);
      setCompleteProfileIntroModalOpen(false);
      return;
    }
    syncOnboardingVisibility(profileCompletionPercentage);
  }, [profileCompletionPercentage]);

  // Load profile image from localStorage using email-based key for persistence
  // This allows the image to persist across logout/login for the same user
  // For new accounts (no professional_id), image should remain blank
  useEffect(() => {
    let isMounted = true;
    
    const loadProfileImage = async () => {
      const professionalId = getProfessionalId();
      const userEmail = getUserEmail();
      
      // Only load image if professional_id exists (professional has been created)
      if (professionalId && !isNaN(professionalId)) {
        // Try to load from email-based key first (persists across sessions)
        // Key format: professional_profile_image_{email} (email normalized to lowercase)
        let storedImageUrl: string | null = null;
        
        if (userEmail) {
          // Normalize email to lowercase to match the key format used during upload
          const normalizedEmail = userEmail.trim().toLowerCase();
          const emailBasedKey = `professional_profile_image_${normalizedEmail}`;
          storedImageUrl = localStorage.getItem(emailBasedKey);
          console.log('Loading profile image from email-based key:', emailBasedKey, 'Found:', !!storedImageUrl);
        }
        
        // Fallback to regular key (for backward compatibility)
        if (!storedImageUrl) {
          storedImageUrl = localStorage.getItem('professional_profile_image');
          console.log('Loading profile image from regular key. Found:', !!storedImageUrl);
        }
        
        if (storedImageUrl && isMounted) {
      // Wrap in startTransition to prevent suspend during initial render
      startTransition(() => {
            if (isMounted) {
        setProfileImageUrl(storedImageUrl);
            }
      });
        } else if (isMounted) {
          // No stored image - try to fetch from API if available
          // For now, keep it blank - the image should be fetched from API in future
          startTransition(() => {
            if (isMounted) {
              setProfileImageUrl(null);
            }
          });
        }
      } else if (isMounted) {
        // New account - ensure image is blank
        startTransition(() => {
          if (isMounted) {
            setProfileImageUrl(null);
          }
        });
      }
    };
    
    loadProfileImage();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Only run on mount - professional_id changes handled in handleSaveProfile

  // Effect to manage reloadProfileImageRef lifecycle
  useEffect(() => {
    reloadProfileImageRef.current = true;
    return () => {
      reloadProfileImageRef.current = false;
    };
  }, []);

  // Effect to reload profile image when email becomes available (e.g., after login)
  // This ensures the image is loaded even if the component mounted before email was set
  // Also retries loading the image periodically until email is available (handles race conditions)
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 10; // Try up to 10 times (1 second total)
    
    const loadImageAfterEmailSet = () => {
      const professionalId = getProfessionalId();
      const userEmail = getUserEmail();
      
      // Only load image if professional_id exists and email is available
      if (professionalId && !isNaN(professionalId) && userEmail && isMounted) {
        // Normalize email to lowercase to match the key format used during upload
        const normalizedEmail = userEmail.trim().toLowerCase();
        const emailBasedKey = `professional_profile_image_${normalizedEmail}`;
        const storedImageUrl = localStorage.getItem(emailBasedKey);
        
        if (storedImageUrl) {
          console.log('Profile image loaded from email-based key after login:', emailBasedKey);
          startTransition(() => {
            if (isMounted && reloadProfileImageRef.current) {
              setProfileImageUrl(storedImageUrl);
            }
          });
          return; // Successfully loaded, stop retrying
        } else {
          // Try regular key as fallback
          const regularKeyUrl = localStorage.getItem('professional_profile_image');
          if (regularKeyUrl) {
            console.log('Profile image loaded from regular key after login');
            startTransition(() => {
              if (isMounted && reloadProfileImageRef.current) {
                setProfileImageUrl(regularKeyUrl);
                // Also store with email-based key for future persistence
                if (normalizedEmail) {
                  localStorage.setItem(emailBasedKey, regularKeyUrl);
                }
              }
            });
            return; // Successfully loaded, stop retrying
          }
        }
      }
      
      // If email or professional_id is not available yet and we haven't exceeded retries, retry
      if (retryCount < maxRetries && isMounted) {
        retryCount++;
        setTimeout(() => {
          if (isMounted) {
            loadImageAfterEmailSet();
          }
        }, 100);
      }
    };
    
    // Initial attempt after a small delay to ensure email is set after login
    const timeoutId = setTimeout(() => {
      loadImageAfterEmailSet();
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []); // Run once on mount, but retry until email is available

  // Fetch services from API on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadServices = async () => {
      // Set loading state synchronously
      setLoadingServices(true);
      setServicesError(null);
      
      try {
        const fetchedServices = await fetchServices();
        
        // Only update state if component is still mounted
        if (isMounted) {
          // Ensure we have a valid array
          if (!Array.isArray(fetchedServices)) {
            console.warn("Services data is not an array:", fetchedServices);
            startTransition(() => {
              setServices([]);
              setServicesError("Invalid services data received.");
              setLoadingServices(false);
            });
            return;
          }
          
          // Filter only ACTIVE services (case-insensitive check)
          const activeServices = fetchedServices.filter(service => 
            service && service.status && service.status.toUpperCase() === "ACTIVE"
          );
          
          // If no active services found, show all services (fallback to show all)
          const servicesToShow = activeServices.length > 0 ? activeServices : fetchedServices;
          
          console.log(`Loaded ${servicesToShow.length} services (${activeServices.length} active, ${fetchedServices.length} total)`);
          
          // Wrap state updates in startTransition to prevent suspend during render
          startTransition(() => {
            setServices(servicesToShow);
            setLoadingServices(false);
            setServicesError(null);
          });
        }
      } catch (error) {
        console.error("Error loading services:", error);
        
        // Only update state if component is still mounted
        if (isMounted) {
          startTransition(() => {
            const errorMessage = (error as any)?.message || "Failed to load services. Please try again later.";
            setServicesError(errorMessage);
            setServices([]);
            setLoadingServices(false);
          });
        }
      }
    };

    loadServices();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  // Function to fetch selected services for a professional
  const fetchSelectedServicesForProfessional = async (profId: number) => {
    try {
      const token = getApiToken();
      const response = await getSelectedServices({
        professional_id: profId,
        api_token: token || undefined
      });

      if (response.status === true && response.data) {
        // Extract service_id values from the response
        // Handle both top-level service_id and nested service.id (API may return either)
        const serviceIds = response.data
          .map(item => item.service_id ?? item.service?.id)
          .filter((id): id is number => typeof id === 'number' && !isNaN(id) && id > 0);

        const statuses: Record<number, string> = {};
        const meta: Record<number, { price?: string; service_area?: string }> = {};
        response.data.forEach((item) => {
          const sid = item.service_id ?? item.service?.id;
          if (typeof sid !== "number") return;
          if (item.status) {
            statuses[sid] = String(item.status).toLowerCase();
          }
          meta[sid] = {
            ...(item.price != null ? { price: formatServicePriceForApi(item.price) } : {}),
            ...(item.service_area?.trim()
              ? { service_area: item.service_area.trim() }
              : {}),
          };
        });
        
        startTransition(() => {
          setSelectedServices(serviceIds);
          setSelectedServiceStatuses(statuses);
          setSelectedServiceMeta(meta);
        });
      } else {
        console.error('Failed to fetch selected services:', response.error || response.message);
        // Don't show error toast as this is not critical
      }
    } catch (error: any) {
      console.error('Error fetching selected services:', error);
      // Don't show error toast as this is not critical
    }
  };

  // Function to fetch profile completion percentage for a professional
  const fetchProfileCompletion = async (profId: number) => {
    try {
      const token = getApiToken();
      const response = await getProfileCompletionPercentage({
        professional_id: profId,
        api_token: token || undefined
      });

      if (response.status === true && response.details && response.profile_completion_percentage !== undefined) {
        const pct = response.profile_completion_percentage || 0;
        startTransition(() => {
          setProfileCompletionDetails(response.details || null);
          setProfileCompletionPercentage(pct);
          syncOnboardingVisibility(pct);
        });
      } else {
        console.error('Failed to fetch profile completion:', response.error || response.message);
        // Don't show error toast as this is not critical
      }
    } catch (error: any) {
      console.error('Error fetching profile completion:', error);
      // Don't show error toast as this is not critical
    }
  };

  // Helper function to format ISO date to readable format
  const formatDate = (isoDateString: string): string => {
    try {
      const date = new Date(isoDateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return isoDateString;
    }
  };

  // Function to fetch certificates for a professional
  const fetchProfessionalCertificates = async (profId: number) => {
    try {
      setLoadingCertifications(true);
      setHasAttemptedFetch(true); // Mark that we've attempted to fetch
      const token = getApiToken();
      const response = await getCertificates({
        professional_id: profId,
        api_token: token || undefined
      });

      if (response.status === true && response.data) {
        startTransition(() => {
          setCertifications(response.data || []);
        });
      } else {
        console.error('Failed to fetch certificates:', response.error || response.message);
        setCertifications([]);
      }
    } catch (error: any) {
      console.error('Error fetching certificates:', error);
      setCertifications([]);
    } finally {
      setLoadingCertifications(false);
    }
  };

  // Fetch experiences via POST /professional-experience/get (api_token only)
  const fetchProfessionalExperiences = async (_profId?: number) => {
    const token = getApiToken();
    if (!token) {
      setLoadingExperiences(false);
      return;
    }
    try {
      setLoadingExperiences(true);
      setHasAttemptedFetchExperiences(true);
      const response = await getProfessionalExperiences({ api_token: token });

      if (response.success && response.data) {
        startTransition(() => {
          setExperiences(Array.isArray(response.data) ? response.data : []);
        });
      } else {
        setExperiences([]);
      }
    } catch (error: unknown) {
      console.error('Error fetching experiences:', error);
      setExperiences([]);
    } finally {
      setLoadingExperiences(false);
    }
  };

  // Function to fetch professional data by ID
  const fetchProfessionalData = async (professionalId: number) => {
    try {
      setLoadingProfessional(true);
      setHasAttemptedFetch(true); // Mark that we've attempted to fetch data (professional_id exists)

      // Paginate /professional/list until this id appears (page 1 alone missed many accounts).
      const currentProfessional = await fetchProfessionalFromListById(professionalId);

      if (currentProfessional) {
        // Populate form data with fetched professional data
        startTransition(() => {
          setFormData(prev => ({
            ...prev,
            name: currentProfessional.name || prev.name,
            email: currentProfessional.email || prev.email,
            phone: currentProfessional.number || prev.phone,
            businessName: currentProfessional.business_name || prev.businessName,
            address: currentProfessional.business_location || prev.address,
            postcode: currentProfessional.post_code || prev.postcode,
            responseTime: currentProfessional.response_time?.trim() || prev.responseTime,
            bio: currentProfessional.about || prev.bio,
            serviceRadius: (() => {
              const miles = parseProfessionalServiceRadiusMiles(currentProfessional);
              return miles != null ? [miles] : prev.serviceRadius;
            })(),
          }));
          setLoadingProfessional(false);
        });

        // Avatar: API returns photo under `user.image` (not localStorage-only). Sync LS when we have a server URL.
        const fromApi = getProfessionalProfileImageUrl(currentProfessional);
        const userEmail = getUserEmail();
        let resolved = fromApi;
        if (!resolved && userEmail) {
          const ne = userEmail.trim().toLowerCase();
          resolved =
            (localStorage.getItem(`professional_profile_image_${ne}`) || "").trim() ||
            (localStorage.getItem("professional_profile_image") || "").trim();
        }
        if (resolved) {
          startTransition(() => {
            setProfileImageUrl(resolved);
          });
          if (fromApi) {
            if (userEmail) {
              localStorage.setItem(`professional_profile_image_${userEmail.trim().toLowerCase()}`, fromApi);
            }
            localStorage.setItem("professional_profile_image", fromApi);
          }
        }

        // Fetch selected services, profile completion, and certificates for this professional
        fetchSelectedServicesForProfessional(professionalId);
        fetchProfileCompletion(professionalId);
        fetchProfessionalCertificates(professionalId);
        fetchProfessionalExperiences(professionalId);
      } else {
        setLoadingProfessional(false);
        const userEmail = getUserEmail();
        if (userEmail) {
          const ne = userEmail.trim().toLowerCase();
          const fromLs =
            (localStorage.getItem(`professional_profile_image_${ne}`) || "").trim() ||
            (localStorage.getItem("professional_profile_image") || "").trim();
          if (fromLs) {
            startTransition(() => setProfileImageUrl(fromLs));
          }
        }
      }
    } catch (error) {
      console.error("Error loading professional data:", error);
      setLoadingProfessional(false);
      // Don't show error toast as this is not critical - user can still edit form
    }
  };

  // Fetch professional data on mount
  // ONLY fetch data if professional_id exists (from professional/create response)
  // If professional_id doesn't exist, keep UI blank
  useEffect(() => {
    let isMounted = true;
    
    const loadProfessionalData = async () => {
      const initialProfessionalId = getProfessionalId();
      const hadMissingId =
        initialProfessionalId == null || Number.isNaN(Number(initialProfessionalId));
      let professionalId = initialProfessionalId;

      // OTP login clears professional_id on logout; restore for returning pros
      if (hadMissingId) {
        const resolved = await resolveAndStoreProfessionalId();
        if (!isMounted) return;
        professionalId = resolved;
      }

      // If professional_id doesn't exist, keep UI blank
      // Professional must complete professional/create process before data is displayed
      if (!professionalId || isNaN(professionalId)) {
        if (isMounted) {
          setLoadingProfessional(false);
          setHasAttemptedFetch(false); // No data exists
        }
        return;
      }

      // Returning OTP login: no signup flag — never show onboarding modal
      if (hadMissingId && isMounted && !readCompleteProfileReminderFlag()) {
        setShowCompleteProfileReminder(false);
        setCompleteProfileIntroModalOpen(false);
      }

      // professional_id exists - fetch and display data
      setHasAttemptedFetch(true);
      
      if (isMounted) {
        await fetchProfessionalData(professionalId);
      }
    };

    loadProfessionalData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle profile image upload
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to upload profile image.");
      return;
    }

    // Check if component is still mounted before proceeding
    if (!reloadProfileImageRef.current) {
      return;
    }

    // Create preview URL immediately for better UX
    const previewUrl = URL.createObjectURL(file);
    if (reloadProfileImageRef.current) {
      setImagePreview(previewUrl);
    }

    // Set loading state synchronously (immediate feedback)
    setIsUploadingImage(true);
    
    try {
      const uploadData: UploadProfileImageRequest = {
        api_token: token,
        file: file
      };

      const response = await uploadProfileImage(uploadData);

      // Check if component is still mounted before updating state
      if (!reloadProfileImageRef.current) {
        URL.revokeObjectURL(previewUrl); // Clean up preview
        return;
      }

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (response.status === true || response.image_url) {
        const imageUrl = response.image_url || "";
        
        // Wrap state updates in startTransition to prevent suspend during render
        startTransition(() => {
          if (reloadProfileImageRef.current) {
            setProfileImageUrl(imageUrl);
            setImagePreview(null); // Clear preview after successful upload
            setIsUploadingImage(false);
          }
        });
        
        // Store in localStorage to persist across sessions
        // Use email-based key so it persists across logout/login for the same user
        // Normalize email to lowercase for consistent key generation
        if (reloadProfileImageRef.current) {
          const userEmail = getUserEmail();
          
          // Store with email-based key (persists across logout/login)
          // Normalize email to lowercase to ensure consistent key generation
          if (userEmail) {
            const normalizedEmail = userEmail.trim().toLowerCase();
            const emailBasedKey = `professional_profile_image_${normalizedEmail}`;
            localStorage.setItem(emailBasedKey, imageUrl);
            console.log('Stored profile image with email-based key:', emailBasedKey);
          }
          
          // Also store with regular key for backward compatibility (session-based)
          localStorage.setItem('professional_profile_image', imageUrl);
          
          toast.success(response.message || "Profile image updated successfully!");
        }
      } else {
        startTransition(() => {
          if (reloadProfileImageRef.current) {
            setImagePreview(null); // Clear preview on error
            setIsUploadingImage(false);
          }
        });
        if (reloadProfileImageRef.current) {
          toast.error(response.message || response.error || "Failed to upload profile image. Please try again.");
        }
      }
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      
      // Check if component is still mounted before showing error
      if (!reloadProfileImageRef.current) {
        return;
      }
      
      // Clean up preview URL on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      const errorMessage = error?.message || error?.error || "An error occurred while uploading the image. Please try again.";
      
      // Wrap state updates in startTransition
      startTransition(() => {
        if (reloadProfileImageRef.current) {
          setImagePreview(null);
          setIsUploadingImage(false);
        }
      });
      
      if (reloadProfileImageRef.current) {
        toast.error(errorMessage);
      }
    } finally {
      // Reset file input (synchronous, safe)
      if (fileInputRef.current && reloadProfileImageRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle certification form
  const handleOpenCertificationForm = () => {
    setShowCertificationForm(true);
  };

  const handleCloseCertificationForm = () => {
    setShowCertificationForm(false);
    // Reset form data
    setCertificationFormData({
      certificate_name: "",
      description: "",
      evidence: "",
      status: "pending"
    });
    setSelectedCertificationFile(null);
    if (certificationFileInputRef.current) {
      certificationFileInputRef.current.value = "";
    }
  };

  const handleCertificationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (allow PDF, images, and common document formats)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a PDF, image, or document file.");
        if (certificationFileInputRef.current) {
          certificationFileInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        toast.error("File size must be less than 10MB.");
        if (certificationFileInputRef.current) {
          certificationFileInputRef.current.value = '';
        }
        return;
      }

      setSelectedCertificationFile(file);
      setCertificationFormData({ ...certificationFormData, evidence: file.name });
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64String = result.split(',')[1] || result;
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCertificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!certificationFormData.certificate_name.trim()) {
      toast.error("Please enter a certificate name");
      return;
    }

    if (!certificationFormData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!selectedCertificationFile) {
      toast.error("Please upload evidence file");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to create a certification.");
      return;
    }

    const professionalId = getProfessionalId();
    if (!professionalId || isNaN(professionalId)) {
      toast.error("Professional profile is required. Please save your profile first.");
      return;
    }

    setIsSubmittingCertification(true);
    try {
      let evidenceValue: string | File;
      try {
        evidenceValue = await prepareCertificationEvidence(selectedCertificationFile);
      } catch (fileError) {
        console.error("Error preparing evidence file:", fileError);
        toast.error("Error processing file. Please try again.");
        setIsSubmittingCertification(false);
        return;
      }

      const response = await createCertification({
        api_token: token,
        certificate_name: certificationFormData.certificate_name.trim(),
        description: certificationFormData.description.trim(),
        evidence: evidenceValue,
        status: certificationFormData.status || "pending",
        professional_id: professionalId,
        title: certificationFormData.certificate_name.trim(),
        certification_date: new Date().toISOString().split("T")[0],
      });

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Certification created successfully!");
        // Close form and reset
        handleCloseCertificationForm();
        
        fetchProfessionalCertificates(professionalId);
        fetchProfileCompletion(professionalId);
      } else {
        toast.error(response.message || response.error || "Failed to create certification. Please try again.");
      }
    } catch (error: any) {
      console.error("Error creating certification:", error);
      const errorMessage = error?.message || error?.error || "An error occurred while creating certification. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmittingCertification(false);
    }
  };

  // Handle experience form
  const handleOpenExperienceForm = () => {
    setShowExperienceForm(true);
  };

  const handleCloseExperienceForm = () => {
    setShowExperienceForm(false);
    // Reset form data
    setExperienceFormData({
      experience_name: "",
      description: "",
      evidence: "",
      status: "pending"
    });
    setSelectedExperienceFile(null);
    if (experienceFileInputRef.current) {
      experienceFileInputRef.current.value = "";
    }
  };

  const handleExperienceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (allow PDF, images, and common document formats)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(`.${fileExtension || ''}`)) {
        toast.error("Please upload a PDF, image, or document file");
        if (experienceFileInputRef.current) {
          experienceFileInputRef.current.value = "";
        }
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("File size must be less than 10MB");
        if (experienceFileInputRef.current) {
          experienceFileInputRef.current.value = "";
        }
        return;
      }

      setSelectedExperienceFile(file);
      setExperienceFormData({ ...experienceFormData, evidence: file.name });
    }
  };

  /** Convert a File to a base64 data URL for the professional-experience/create API */
  const fileToBase64DataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleExperienceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!experienceFormData.experience_name.trim()) {
      toast.error("Please enter an experience name");
      return;
    }
    if (!experienceFormData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (!selectedExperienceFile) {
      toast.error("Please upload evidence file");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to create an experience.");
      return;
    }

    const professionalId = getProfessionalId();
    if (!professionalId || isNaN(professionalId)) {
      toast.error("Professional profile is required. Please complete your profile first.");
      return;
    }

    setIsSubmittingExperience(true);
    try {
      const evidenceBase64 = await fileToBase64DataUrl(selectedExperienceFile);

      const response = await createProfessionalExperience({
        api_token: token,
        experience_name: experienceFormData.experience_name.trim(),
        description: experienceFormData.description.trim(),
        professional_id: professionalId,
        evidence: evidenceBase64,
      });

      if (response.success && response.data) {
        toast.success(response.message || "Experience created successfully!");
        const created = response.data;
        const newItem: ExperienceItem = {
          id: created.id,
          professional_id: created.professional_id,
          experience_name: created.experience_name,
          description: created.description,
          evidence: created.evidence,
          status: created.status ?? "pending",
          created_at: created.created_at,
          updated_at: created.updated_at,
        };
        setExperiences((prev) => [newItem, ...prev]);
        handleCloseExperienceForm();
        fetchProfessionalExperiences(professionalId);
        fetchProfileCompletion(professionalId);
      } else {
        toast.error(response.message || "Failed to create experience. Please try again.");
      }
    } catch (error: unknown) {
      const err = error as { message?: string; error?: string };
      toast.error(err?.message || err?.error || "An error occurred while creating experience. Please try again.");
    } finally {
      setIsSubmittingExperience(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validate required fields from Basic Information
    if (!formData.name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!formData.businessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    if (!formData.bio.trim()) {
      toast.error("Please enter your professional bio");
      return;
    }

    // Validate required fields from Contact Information
    if (!formData.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("Please enter your business address");
      return;
    }
    if (!formData.postcode.trim()) {
      toast.error("Please enter your postcode");
      return;
    }

    // Validate services selection
    if (selectedServices.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to save your profile.");
      return;
    }

    try {
      // POST /professional/create expects { service_id, price, service_area } per row (strings)
      const defaultServiceArea =
        formData.address.trim() || formData.businessName.trim() || formData.postcode.trim();
      const servicePayload: CreateProfessionalServiceItem[] = selectedServices.map((serviceId) => {
        const saved = selectedServiceMeta[serviceId];
        const catalog = services.find((s) => s.id === serviceId);
        const priceRaw = saved?.price ?? catalog?.from_price ?? catalog?.price;
        return {
          service_id: serviceId,
          price: formatServicePriceForApi(priceRaw),
          service_area: saved?.service_area || defaultServiceArea,
        };
      });

      const existingProfessionalId = getProfessionalId();

      // Certificates upload via "Submit Certification" only (POST /qualifications-certification/create)
      const requestPayload: CreateProfessionalRequest = {
        api_token: token,
        name: formData.name.trim(),
        business_name: formData.businessName.trim(),
        about: formData.bio.trim(),
        email: formData.email.trim(),
        number: formData.phone.trim(),
        business_location: formData.address.trim(),
        post_code: formData.postcode.trim(),
        response_time: formData.responseTime.trim(),
        radius: String(formData.serviceRadius[0]),
        services: servicePayload,
        ...(existingProfessionalId != null &&
          !Number.isNaN(existingProfessionalId) && { professional_id: existingProfessionalId }),
      };

      const response = await createProfessional(requestPayload);

      // Check for success: status can be true (boolean) or "success" (string)
      const isSuccess = response.status === true || 
                        response.status === "success" || 
                        response.success === true ||
                        (response.message && !response.error && response.status !== false);

      if (isSuccess) {
        toast.success(response.message || "Profile saved successfully!");

        // First-time signup reminder: hide modal + banner permanently for this session after successful submit
        clearCompleteProfileReminderFlag();
        setShowCompleteProfileReminder(false);
        setCompleteProfileIntroModalOpen(false);

        // Extract professional id — create and update payloads may use different shapes (id may be string from API)
        const coercePositiveInt = (v: unknown): number | undefined => {
          if (v == null || v === '') return undefined;
          const n = typeof v === 'number' ? v : parseInt(String(v), 10);
          return Number.isFinite(n) && n > 0 ? n : undefined;
        };
        const profIdFromResponse =
          coercePositiveInt(response.data?.professional?.id) ??
          coercePositiveInt(response.data?.id) ??
          coercePositiveInt(response.data?.professional_id);
        const topLevelId = coercePositiveInt(response.professional_id);
        const existingId = getProfessionalId();
        const effectiveProfessionalId =
          profIdFromResponse ??
          topLevelId ??
          (existingId != null && !Number.isNaN(existingId) ? existingId : undefined);

        console.log('Professional save — effective professional_id:', effectiveProfessionalId, 'raw:', response.data);

        if (effectiveProfessionalId != null && !Number.isNaN(Number(effectiveProfessionalId))) {
          const pid = Number(effectiveProfessionalId);

          const savedResponseTime =
            typeof response.data?.professional?.response_time === "string"
              ? response.data.professional.response_time.trim()
              : formData.responseTime.trim();
          const savedServiceRadius = parseProfessionalServiceRadiusMiles(
            (response.data?.professional && typeof response.data.professional === "object"
              ? response.data.professional
              : response.data) as Record<string, unknown>
          );
          startTransition(() => {
            setProfessionalId(pid);
            setFormData((prev) => ({
              ...prev,
              ...(savedResponseTime ? { responseTime: savedResponseTime } : {}),
              ...(savedServiceRadius != null
                ? { serviceRadius: [savedServiceRadius] }
                : {}),
            }));
            fetchProfileCompletion(pid);
            fetchSelectedServicesForProfessional(pid);
            fetchProfessionalCertificates(pid);
            fetchProfessionalExperiences(pid);
            void fetchProfessionalData(pid);
          });
        } else {
          console.error('Failed to extract professional_id from response:', response.data);
          toast.error("Profile saved but professional ID not found in response. Please refresh the page.");
        }
        
      } else {
        toast.error(response.message || response.error || "Failed to save profile. Please try again.");
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      const errorMessage = error?.message || error?.error || "An error occurred while saving your profile. Please try again.";
      toast.error(errorMessage);
    }
  };

  // Calculate completion steps based on API data
  const completionSteps = [
    { 
      id: 1, 
      title: "Basic Information", 
      completed: profileCompletionDetails ? profileCompletionDetails.basic_info === 20 : false 
    },
    { 
      id: 2, 
      title: "Contact Details", 
      completed: profileCompletionDetails ? profileCompletionDetails.contact_info === 20 : false 
    },
    { 
      id: 3, 
      title: "Service Selection", 
      completed: profileCompletionDetails ? profileCompletionDetails.selected_services === 20 : false 
    },
    { 
      id: 4, 
      title: "Certifications", 
      completed: profileCompletionDetails ? profileCompletionDetails.certificates === 20 : false 
    },
    { 
      id: 5, 
      title: "Profile Photo", 
      completed: profileCompletionDetails ? profileCompletionDetails.profile_image === 20 : !!profileImageUrl 
    },
  ];

  // Use API percentage if available, otherwise calculate from steps
  const completionPercentage = profileCompletionPercentage > 0 
    ? profileCompletionPercentage 
    : (completionSteps.filter(s => s.completed).length / completionSteps.length) * 100;

  /** Preview sidebar: photo from state, preview blob, or API completion flag */
  const hasProfilePhotoForPreview =
    !!profileImageUrl ||
    !!imagePreview ||
    profileCompletionDetails?.profile_image === 20;

  /** Hide the yellow nudge when the profile is complete and a photo exists; avoid "add a photo" if they already have one */
  const showProfilePreviewNudge =
    completionPercentage < 100 || !hasProfilePhotoForPreview;

  return (
    <div className="min-w-0 w-full max-w-full">
      <Dialog open={completeProfileIntroModalOpen} onOpenChange={setCompleteProfileIntroModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0A1A2F] text-lg sm:text-xl pr-8">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0" aria-hidden />
              Complete your profile to continue
            </DialogTitle>
            <DialogDescription className="text-left text-base text-gray-700 pt-1">
            Must fill out and save this form to create your professional profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                setIntroModalDismissedByUser(true);
                setCompleteProfileIntroModalOpen(false);
              }}
            >
              Continue to the form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCompleteProfileReminder && !completeProfileIntroModalOpen && (
        <Alert
          role="alert"
          className="mb-6 border-2 border-red-600 bg-red-50 shadow-md"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3 min-w-0">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" aria-hidden />
              <AlertDescription className="m-0 text-base sm:text-lg font-semibold text-red-950 leading-snug">
                Please complete your profile.
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-red-300 bg-white hover:bg-red-100 text-red-900"
              onClick={() => {
                clearCompleteProfileReminderFlag();
                setShowCompleteProfileReminder(false);
              }}
            >
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {/* Page Header */}
      <div className="mb-6 sm:mb-8 min-w-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl text-[#0A1A2F] mb-2">
          Complete Your Profile
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Tell customers about your services and experience
        </p>
      </div>

      {/* Profile Completion Progress */}
      <Card className="mb-4 sm:mb-6 border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 min-w-0 overflow-hidden">
        <CardContent className="p-4 sm:p-6 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Profile Completion</h3>
            <span className="text-sm font-semibold text-blue-600">{completionPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-3 mb-4">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 min-w-0">
            {completionSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-sm min-w-0">
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <span className={`min-w-0 break-words ${step.completed ? "text-gray-900" : "text-gray-500"}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        {/* Main Form - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          {/* Basic Information */}
          <Card className="border-0 shadow-md min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                Basic Information
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Your personal and business details visible to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 min-w-0 [&_input]:min-w-0 [&_input]:max-w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                <div className="min-w-0">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input 
                    id="name" 
                    className="w-full min-w-0 max-w-full"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input 
                    id="businessName" 
                    className="w-full min-w-0 max-w-full"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  />
                </div>
              </div>

              <div className="min-w-0">
                <Label htmlFor="bio">Professional Bio *</Label>
                <Textarea 
                  id="bio"
                  rows={4}
                  className="w-full min-w-0 max-w-full"
                  placeholder="Describe your experience, qualifications, and what makes your service unique..."
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-0 shadow-md min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                Contact Information
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                How customers and Fire Guide can reach you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 min-w-0 [&_input]:min-w-0 [&_input]:max-w-full">
              <div className="min-w-0">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  Email Address *
                </Label>
                <Input 
                  id="email" 
                  type="email"
                  className="w-full min-w-0 max-w-full"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  Phone Number *
                </Label>
                <Input 
                  id="phone" 
                  type="tel"
                  className="w-full min-w-0 max-w-full"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="min-w-0">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  Business Address *
                </Label>
                <Input 
                  id="address" 
                  className="w-full min-w-0 max-w-full"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="min-w-0 max-w-full sm:max-w-xs">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input 
                  id="postcode" 
                  className="w-full min-w-0 max-w-full"
                  value={formData.postcode}
                  onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                />
              </div>
              <div className="min-w-0 md:col-span-2">
                <Label htmlFor="responseTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  Response Time
                </Label>
                <Input
                  id="responseTime"
                  className="w-full min-w-0 max-w-full"
                  placeholder="e.g. Within 2 hours"
                  value={formData.responseTime}
                  onChange={(e) => setFormData({ ...formData, responseTime: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Shown to customers when they compare professionals and view your profile.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Services Offered */}
          <Card className="border-0 shadow-md min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                Services Offered
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Select all services you can provide
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {loadingServices ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-gray-500">Loading services...</p>
                </div>
              ) : servicesError ? (
                <div className="text-center py-6 sm:py-8">
                  <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm sm:text-base text-red-600">{servicesError}</p>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-gray-500">No services available</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg hover:border-red-200 hover:bg-red-50/50 transition-all">
                      <Checkbox 
                        id={`service-${service.id}`}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedServices([...selectedServices, service.id]);
                          } else {
                            setSelectedServices(selectedServices.filter(id => id !== service.id));
                          }
                        }}
                        className="mt-0.5 sm:mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <label htmlFor={`service-${service.id}`} className="font-medium text-sm sm:text-base text-gray-900 cursor-pointer break-words flex-1 min-w-0">
                            {service.service_name}
                          </label>
                          {selectedServices.includes(service.id) && selectedServiceStatuses[service.id] && (
                            <Badge
                              className={`flex-shrink-0 text-xs ${
                                selectedServiceStatuses[service.id] === 'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : selectedServiceStatuses[service.id] === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {selectedServiceStatuses[service.id] === 'approved' && (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                              )}
                              {selectedServiceStatuses[service.id] === 'pending' && (
                                <Clock className="w-3 h-3 mr-1" />
                              )}
                              {selectedServiceStatuses[service.id] === 'rejected' && (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {selectedServiceStatuses[service.id].charAt(0).toUpperCase() +
                                selectedServiceStatuses[service.id].slice(1)}
                            </Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{service.description}</p>
                        )}
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-wrap">
                          {service.type && (
                            <span className="px-2 py-0.5 sm:py-1 bg-gray-100 rounded whitespace-nowrap">{service.type}</span>
                          )}
                          {(service.from_price || service.price) && (
                            <span className="font-semibold text-red-600">
                              {formatServiceFromPrice(service)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Area */}
          <Card className="border-0 shadow-md min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                Service Area
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 mt-2">
                Define how far you&apos;re willing to travel for jobs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 sm:space-y-6 p-4 sm:p-6 pt-0 min-w-0">
              <div>
                <div className="flex items-center justify-between mb-4 gap-3">
                  <Label className="text-sm sm:text-base text-gray-900">Service Radius</Label>
                  <span className="text-sm sm:text-base font-semibold text-red-600 whitespace-nowrap">
                    {formData.serviceRadius[0]} miles
                  </span>
                </div>
                <Slider
                  value={formData.serviceRadius}
                  onValueChange={(value) => setFormData({ ...formData, serviceRadius: value })}
                  min={5}
                  max={100}
                  step={5}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>5 miles</span>
                  <span>100 miles</span>
                </div>
              </div>

              {/* Emergency callouts — hidden per product request
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="emergency-callout"
                    checked={formData.emergencyCallout}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, emergencyCallout: checked === true })
                    }
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor="emergency-callout"
                      className="text-sm sm:text-base font-semibold text-gray-900 cursor-pointer"
                    >
                      Available for Emergency Callouts
                    </label>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Get priority bookings for urgent fire safety issues
                    </p>
                  </div>
                </div>
              </div>
              */}
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card className="border-0 shadow-md min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                Certifications & Qualifications
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 mt-2">
                Upload your certificates. An admin will review and mark them as Verified, Pending, or Rejected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
              {loadingCertifications ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Loading certifications...</p>
                </div>
              ) : certifications.length > 0 ? (
                certifications.map((cert) => (
                <div 
                  key={cert.id} 
                    className={`p-3 sm:p-4 border rounded-lg min-w-0 overflow-hidden ${
                    cert.status === 'verified' ? 'bg-green-50 border-green-200' :
                    cert.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                    'bg-red-50 border-red-200'
                  }`}
                >
                  {/* Header with title and status */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                          {/* Prominent Checkmark for Verified Certifications */}
                          {cert.status === 'verified' && (
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                          )}
                          {cert.status === 'pending' && (
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
                          )}
                          {cert.status === 'rejected' && (
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                          )}
                          <h4 className="font-medium text-sm sm:text-base text-gray-900 break-words">{cert.certificate_name}</h4>
                        </div>
                        
                        {/* Description if available */}
                        {cert.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{cert.description}</p>
                        )}
                      
                      {/* Evidence Info Row */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0 w-full">
                          <p className="text-xs sm:text-sm text-gray-600 min-w-0 flex-1">
                            <span className="font-medium text-gray-700">Evidence</span>
                            <span className="text-gray-500"> (1 file)</span>
                            <span className="mt-1 block text-gray-700 break-all">{cert.evidence}</span>
                          </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                            className="h-7 shrink-0 self-start text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setSelectedCertification(cert);
                              setIsCertificationModalOpen(true);
                            }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>

                    {/* Status Badge */}
                      <div className="shrink-0 self-start">
                      {cert.status === 'verified' && (
                        <Badge className="bg-green-600 text-white whitespace-normal">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {cert.status === 'pending' && (
                        <Badge className="bg-amber-500 text-white whitespace-normal text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending verification
                        </Badge>
                      )}
                      {cert.status === 'rejected' && (
                        <Badge className="bg-red-600 text-white whitespace-normal">
                          <XCircle className="w-3 h-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Additional info based on status */}
                    {cert.status === 'verified' && cert.updated_at && (
                    <p className="text-xs text-green-700">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        Verified on {formatDate(cert.updated_at)}
                    </p>
                  )}
                  {cert.status === 'pending' && (
                    <p className="text-xs text-amber-700">
                      <Clock className="w-3 h-3 inline mr-1" />
                        Uploaded {formatDate(cert.created_at)} - Awaiting admin review
                    </p>
                  )}
                    {cert.status === 'rejected' && cert.updated_at && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded">
                      <p className="text-xs text-red-900 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span><strong>Rejected on:</strong> {formatDate(cert.updated_at)}</span>
                      </p>
                    </div>
                  )}
                </div>
                ))
              ) : hasAttemptedFetch ? (
                // Only show "no certifications" message if we've attempted to fetch (i.e., professional_id exists)
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-gray-500">No certifications found. Upload one to get started!</p>
                </div>
              ) : (
                // If no professional_id exists, show blank UI (no certifications displayed)
                null
              )}

              <Button 
                variant="outline" 
                className="w-full mt-4 sm:mt-6 h-10 sm:h-11 text-sm sm:text-base"
                onClick={handleOpenCertificationForm}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New Certification
              </Button>

              {/* Inline Certification Form */}
              {showCertificationForm && (
                <Card className="mt-6 border-2 border-red-200 shadow-lg">
                  <CardHeader className="relative pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle>Add New Certification</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCloseCertificationForm}
                        className="h-8 w-8 hover:bg-gray-100"
                        aria-label="Close form"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCertificationSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="certificate_name">Certificate Name *</Label>
                        <Input
                          id="certificate_name"
                          value={certificationFormData.certificate_name}
                          onChange={(e) => setCertificationFormData({ ...certificationFormData, certificate_name: e.target.value })}
                          placeholder="e.g., Fire Risk Assessment Level 4, NEBOSH Fire Safety"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cert_description">Description *</Label>
                        <Textarea
                          id="cert_description"
                          value={certificationFormData.description}
                          onChange={(e) => setCertificationFormData({ ...certificationFormData, description: e.target.value })}
                          placeholder="Enter a detailed description of the certification..."
                          className="min-h-[120px]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cert_evidence">Evidence (File Upload) *</Label>
                        <Input
                          ref={certificationFileInputRef}
                          id="cert_evidence"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                          onChange={handleCertificationFileChange}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          required={!certificationFormData.evidence}
                        />
                        {selectedCertificationFile && (
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{selectedCertificationFile.name}</p>
                              <p className="text-xs text-gray-500">{(selectedCertificationFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCertificationFile(null);
                                setCertificationFormData({ ...certificationFormData, evidence: "" });
                                if (certificationFileInputRef.current) {
                                  certificationFileInputRef.current.value = '';
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Accepted formats: PDF, JPG, PNG, GIF, DOC, DOCX (Max size: 10MB)
                        </p>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCloseCertificationForm}
                          disabled={isSubmittingCertification}
                          className="h-10"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-red-600 hover:bg-red-700 h-10"
                          disabled={isSubmittingCertification}
                        >
                          {isSubmittingCertification ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Certification"
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card className="border-0 shadow-md min-w-0 overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                Experience
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 mt-2">
                Upload your experience details and evidence. An admin will review and mark them as Verified, Pending, or Rejected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
              {loadingExperiences ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Loading experiences...</p>
                </div>
              ) : experiences.length > 0 ? (
                experiences.map((exp) => (
                <div 
                  key={exp.id} 
                    className={`p-3 sm:p-4 border rounded-lg min-w-0 overflow-hidden ${
                    exp.status === 'verified' ? 'bg-green-50 border-green-200' :
                    exp.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                    'bg-red-50 border-red-200'
                  }`}
                >
                  {/* Header with title and status */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                          {/* Prominent Checkmark for Verified Experiences */}
                          {exp.status === 'verified' && (
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                          )}
                          {exp.status === 'pending' && (
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
                          )}
                          {exp.status === 'rejected' && (
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                          )}
                          <h4 className="font-medium text-sm sm:text-base text-gray-900 break-words">{exp.experience_name}</h4>
                        </div>
                        
                        {/* Description if available */}
                        {exp.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{exp.description}</p>
                        )}
                      
                      {/* Evidence Info Row */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0 w-full">
                          <p className="text-xs sm:text-sm text-gray-600 min-w-0 flex-1">
                            <span className="font-medium text-gray-700">Evidence</span>
                            <span className="text-gray-500"> (1 file)</span>
                            <span className="mt-1 block text-gray-700 break-all">{exp.evidence}</span>
                          </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                            className="h-7 shrink-0 self-start text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setSelectedExperience(exp);
                              setIsExperienceModalOpen(true);
                            }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>

                    {/* Status Badge */}
                      <div className="shrink-0 self-start">
                      {exp.status === 'verified' && (
                        <Badge className="bg-green-600 text-white whitespace-normal">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {exp.status === 'pending' && (
                        <Badge className="bg-amber-500 text-white whitespace-normal text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending verification
                        </Badge>
                      )}
                      {exp.status === 'rejected' && (
                        <Badge className="bg-red-600 text-white whitespace-normal">
                          <XCircle className="w-3 h-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Additional info based on status */}
                    {exp.status === 'verified' && exp.updated_at && (
                    <p className="text-xs text-green-700">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        Verified on {formatDate(exp.updated_at)}
                    </p>
                  )}
                  {exp.status === 'pending' && (
                    <p className="text-xs text-amber-700">
                      <Clock className="w-3 h-3 inline mr-1" />
                        Uploaded {formatDate(exp.created_at)} - Awaiting admin review
                    </p>
                  )}
                    {exp.status === 'rejected' && exp.updated_at && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded">
                      <p className="text-xs text-red-900 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span><strong>Rejected on:</strong> {formatDate(exp.updated_at)}</span>
                      </p>
                    </div>
                  )}
                </div>
                ))
              ) : hasAttemptedFetchExperiences ? (
                // Only show "no experiences" message if we've attempted to fetch (i.e., professional_id exists)
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-gray-500">No experiences found. Upload one to get started!</p>
                </div>
              ) : (
                // If no professional_id exists, show blank UI (no experiences displayed)
                null
              )}

              <Button 
                variant="outline" 
                className="w-full mt-4 sm:mt-6 h-10 sm:h-11 text-sm sm:text-base"
                onClick={handleOpenExperienceForm}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New Experience
              </Button>

              {/* Inline Experience Form */}
              {showExperienceForm && (
                <Card className="mt-6 border-2 border-red-200 shadow-lg">
                  <CardHeader className="relative pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle>Add New Experience</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCloseExperienceForm}
                        className="h-8 w-8 hover:bg-gray-100"
                        aria-label="Close form"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleExperienceSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="experience_name">Experience Name *</Label>
                        <Input
                          id="experience_name"
                          value={experienceFormData.experience_name}
                          onChange={(e) => setExperienceFormData({ ...experienceFormData, experience_name: e.target.value })}
                          placeholder="e.g., 5 Years Fire Safety Experience, Commercial Fire Alarm Installation"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="exp_description">Description *</Label>
                        <Textarea
                          id="exp_description"
                          value={experienceFormData.description}
                          onChange={(e) => setExperienceFormData({ ...experienceFormData, description: e.target.value })}
                          placeholder="Enter a detailed description of your experience..."
                          className="min-h-[120px]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="exp_evidence">Evidence (File Upload) *</Label>
                        <Input
                          ref={experienceFileInputRef}
                          id="exp_evidence"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                          onChange={handleExperienceFileChange}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          required={!experienceFormData.evidence}
                        />
                        {selectedExperienceFile && (
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{selectedExperienceFile.name}</p>
                              <p className="text-xs text-gray-500">{(selectedExperienceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedExperienceFile(null);
                                setExperienceFormData({ ...experienceFormData, evidence: "" });
                                if (experienceFileInputRef.current) {
                                  experienceFileInputRef.current.value = '';
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCloseExperienceForm}
                          disabled={isSubmittingExperience}
                          className="h-10"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-red-600 hover:bg-red-700 h-10"
                          disabled={isSubmittingExperience}
                        >
                          {isSubmittingExperience ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Experience"
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Takes 1 column on desktop */}
        <div className="space-y-6 min-w-0">
          {/* Profile Preview */}
          <Card className="border-0 shadow-md sticky top-4 sm:top-6 min-w-0 overflow-hidden lg:static">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Profile Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
              <div className="text-center">
                <div 
                  className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handleImageClick}
                >
                  {(profileImageUrl || imagePreview) ? (
                    <img 
                      src={imagePreview || profileImageUrl || ""} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                  )}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleImageClick}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : profileImageUrl ? (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Change Photo
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </Button>
              </div>



              <div>
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 break-words">{formData.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{formData.businessName}</p>
                <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 flex-wrap">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="break-words">{formData.postcode}</span>
                </div>
                {formData.responseTime.trim() ? (
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-green-700 mt-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="break-words">{formData.responseTime.trim()}</span>
                  </div>
                ) : null}
              </div>

              <div className="pt-3 sm:pt-4 border-t">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-600">Services</span>
                  <span className="font-semibold text-gray-900">{selectedServices.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-600">Service Radius</span>
                  <span className="font-semibold text-gray-900">{formData.serviceRadius[0]} mi</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-600">Certifications</span>
                  <span className="font-semibold text-gray-900">
                    {hasAttemptedFetch ? certifications.length : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Experience</span>
                  <span className="font-semibold text-gray-900">
                    {hasAttemptedFetchExperiences ? experiences.length : 0}
                  </span>
                </div>
              </div>

              {showProfilePreviewNudge && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-yellow-900 mb-1 break-words">
                        {hasProfilePhotoForPreview ? "Strengthen your profile" : "Complete your profile"}
                      </p>
                      <p className="text-xs sm:text-sm text-yellow-800 break-words">
                        {hasProfilePhotoForPreview
                          ? "Finish the sections above and add certifications where you can — complete profiles get more bookings."
                          : "Add a photo and more certifications to increase booking chances."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="border-0 shadow-md bg-blue-50 min-w-0 overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-3">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base text-blue-900 mb-1">Profile Tips</p>
                  <ul className="text-xs sm:text-sm text-blue-800 space-y-0.5 sm:space-y-1">
                    <li>• Complete profiles get 3x more bookings</li>
                    <li>• Add a professional photo</li>
                    <li>• List all your certifications</li>
                    <li>• Write a detailed bio</li>
                  </ul>
                </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button - sticky on mobile within content width */}
      <div className="sticky bottom-0 z-10 mt-6 border-t bg-white p-4 shadow-lg min-w-0 w-full lg:static lg:z-auto lg:shadow-none lg:border-0">
        <div className="flex flex-col md:flex-row gap-3 w-full min-w-0">
          <Button 
            className="flex-1 bg-red-600 hover:bg-red-700 h-12"
            onClick={handleSaveProfile}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Profile Changes
          </Button>
          <Button variant="outline" className="md:w-auto h-12">
            Cancel
          </Button>
        </div>
      </div>

      {/* Certification Details Modal */}
      <Dialog open={isCertificationModalOpen} onOpenChange={setIsCertificationModalOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-[1200px] p-4 sm:p-6 md:p-8 lg:p-[30px]"
        >
          <DialogHeader>
            <div className="flex-1">
              <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Certification Details
              </DialogTitle>
              <DialogDescription>
                {selectedCertification ? `View details for ${selectedCertification.name}` : 'Certification information'}
              </DialogDescription>
            </div>
          </DialogHeader>
          
          {selectedCertification && (
            <div className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
              {/* Certification Name */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Certification Name
                </Label>
                <div className="flex items-center gap-2">
                  {selectedCertification.status === 'verified' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                  {selectedCertification.status === 'pending' && (
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  )}
                  {selectedCertification.status === 'rejected' && (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <p className="text-base font-medium text-gray-900">{selectedCertification.name}</p>
                </div>
              </div>

              {/* Description */}
              {selectedCertification.description && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                    Description
                  </Label>
                  <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-200 break-words">
                    {selectedCertification.description}
                  </p>
                </div>
              )}

              {/* Evidence */}
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                  Evidence
                </Label>
                <div className="flex items-center gap-2 bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-200 flex-wrap">
                  <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700 flex-1 min-w-0 break-all">{selectedCertification.evidence}</p>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    1 file
                  </Badge>
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                  Status
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedCertification.status === 'verified' && (
                    <Badge className="bg-green-600 text-white text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {selectedCertification.status === 'pending' && (
                    <Badge className="bg-amber-500 text-white text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      <span className="whitespace-nowrap">Pending verification</span>
                    </Badge>
                  )}
                  {selectedCertification.status === 'rejected' && (
                    <Badge className="bg-red-600 text-white text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                </div>
              </div>

              {/* Upload Date */}
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                  Upload Date
                </Label>
                <p className="text-xs sm:text-sm text-gray-700 flex items-center gap-2 flex-wrap">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <span>{formatDate(selectedCertification.created_at)}</span>
                </p>
              </div>

              {/* Verification/Rejection Date */}
              {selectedCertification.status === 'verified' && selectedCertification.updated_at && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                    Verified Date
                  </Label>
                  <p className="text-xs sm:text-sm text-green-700 flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{formatDate(selectedCertification.updated_at)}</span>
                  </p>
                </div>
              )}

              {selectedCertification.status === 'rejected' && selectedCertification.updated_at && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                    Rejected Date
                  </Label>
                  <p className="text-xs sm:text-sm text-red-700 flex items-center gap-2 flex-wrap">
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{formatDate(selectedCertification.updated_at)}</span>
                  </p>
                </div>
              )}

              {/* Status Message */}
              {selectedCertification.status === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-amber-800 flex items-center gap-2 flex-wrap">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>Awaiting admin review</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Experience Details Modal */}
      <Dialog open={isExperienceModalOpen} onOpenChange={setIsExperienceModalOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto w-[95%] sm:w-[90%] md:w-[85%] lg:w-[80%] max-w-[1200px] p-4 sm:p-6 md:p-8 lg:p-[30px]"
        >
          <DialogHeader>
            <div className="flex-1">
              <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Experience Details
              </DialogTitle>
              <DialogDescription>
                {selectedExperience ? `View details for ${selectedExperience.experience_name}` : 'Experience information'}
              </DialogDescription>
            </div>
          </DialogHeader>
          
          {selectedExperience && (
            <div className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
              {/* Experience Name */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Experience Name
                </Label>
                <div className="flex items-center gap-2">
                  {selectedExperience.status === 'verified' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                  {selectedExperience.status === 'pending' && (
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  )}
                  {selectedExperience.status === 'rejected' && (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <p className="text-base font-medium text-gray-900">{selectedExperience.experience_name}</p>
                </div>
              </div>

              {/* Description */}
              {selectedExperience.description && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                    Description
                  </Label>
                  <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-200 break-words">
                    {selectedExperience.description}
                  </p>
                </div>
              )}

              {/* Evidence */}
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                  Evidence
                </Label>
                <div className="flex items-center gap-2 bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-200 flex-wrap">
                  <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-700 flex-1 min-w-0 break-all">{selectedExperience.evidence}</p>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    1 file
                  </Badge>
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                  Status
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedExperience.status === 'verified' && (
                    <Badge className="bg-green-600 text-white text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {selectedExperience.status === 'pending' && (
                    <Badge className="bg-amber-500 text-white text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      <span className="whitespace-nowrap">Pending verification</span>
                    </Badge>
                  )}
                  {selectedExperience.status === 'rejected' && (
                    <Badge className="bg-red-600 text-white text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                </div>
              </div>

              {/* Upload Date */}
              <div>
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                  Upload Date
                </Label>
                <p className="text-xs sm:text-sm text-gray-700 flex items-center gap-2 flex-wrap">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <span>{formatDate(selectedExperience.created_at)}</span>
                </p>
              </div>

              {/* Verification/Rejection Date */}
              {selectedExperience.status === 'verified' && selectedExperience.updated_at && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                    Verified Date
                  </Label>
                  <p className="text-xs sm:text-sm text-green-700 flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{formatDate(selectedExperience.updated_at)}</span>
                  </p>
                </div>
              )}

              {selectedExperience.status === 'rejected' && selectedExperience.updated_at && (
                <div>
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                    Rejected Date
                  </Label>
                  <p className="text-xs sm:text-sm text-red-700 flex items-center gap-2 flex-wrap">
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{formatDate(selectedExperience.updated_at)}</span>
                  </p>
                </div>
              )}

              {/* Status Message */}
              {selectedExperience.status === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-amber-800 flex items-center gap-2 flex-wrap">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>Awaiting admin review</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}