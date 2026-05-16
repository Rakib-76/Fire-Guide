import React, { useState, useEffect, useRef } from "react";
import { Shield, CheckCircle, AlertCircle, Upload, FileText, Award, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { getProfessionalWiseIdentity, createProfessionalIdentity, updateProfessionalIdentity, ProfessionalIdentityItem, getVerificationSummary, VerificationSummaryData, getProfessionalWiseEvidence, ProfessionalEvidenceItem } from "../api/professionalsService";
import { createCertification, updateEvidence } from "../api/qualificationsService";
import { showInsuranceCoverage, InsuranceItem, updateInsuranceDocument, createInsuranceDocument } from "../api/insuranceService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { resolveApiBaseUrl } from "../lib/apiBaseUrl";
import { toast } from "sonner";

export function ProfessionalVerification() {
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [identityData, setIdentityData] = useState<ProfessionalIdentityItem | null>(null);
  const [qualificationsEvidence, setQualificationsEvidence] = useState<ProfessionalEvidenceItem[]>([]);
  const [insuranceData, setInsuranceData] = useState<InsuranceItem[]>([]);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(false);
  const [verificationSummary, setVerificationSummary] = useState<VerificationSummaryData | null>(null);
  const [currentUploadRequirement, setCurrentUploadRequirement] = useState<string | null>(null);
  const [currentEvidenceId, setCurrentEvidenceId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Fetch verification summary data
  const fetchVerificationSummary = async () => {
    try {
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching verification summary");
        return;
      }

      const response = await getVerificationSummary({ api_token: apiToken });
      
      if (response.status === true && response.data) {
        setVerificationSummary(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching verification summary:", err);
    }
  };

  // Fetch qualifications evidence data
  const fetchQualificationsEvidence = async () => {
    try {
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching qualifications evidence");
        return;
      }

      const response = await getProfessionalWiseEvidence({ api_token: apiToken });
      
      if (response.status === true && response.data) {
        setQualificationsEvidence(response.data);
      } else {
        setQualificationsEvidence([]);
      }
    } catch (err: any) {
      console.error("Error fetching qualifications evidence:", err);
      setQualificationsEvidence([]);
    }
  };

  // Fetch insurance coverage data
  const fetchInsuranceData = async () => {
    try {
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching insurance coverage");
        return;
      }

      const response = await showInsuranceCoverage({ api_token: apiToken });
      
      if (response.status === 'success' && response.data) {
        setInsuranceData(response.data);
      } else {
        setInsuranceData([]);
      }
    } catch (err: any) {
      console.error("Error fetching insurance coverage:", err);
      setInsuranceData([]);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchIdentityData();
    fetchVerificationSummary();
    fetchQualificationsEvidence();
    fetchInsuranceData();
  }, []);

  // Progress: each of insurance, certificate, identity true = one third (no other logic).
  const verificationChecks = verificationSummary?.checks;
  const verificationCompletedCount = [
    verificationChecks?.insurance === true,
    verificationChecks?.certificate === true,
    verificationChecks?.identity === true,
  ].filter(Boolean).length;
  const verificationStatus = {
    overall: verificationSummary?.active_status || identityData?.status || "pending",
    completionPercentage: Math.round((verificationCompletedCount / 3) * 100),
  };

  // Map API checks to requirement status (verified = true, pending = false)
  const getRequirementStatus = (checkValue: boolean | undefined) => {
    if (checkValue === undefined) return "pending";
    return checkValue ? "verified" : "pending";
  };

  const normalizeUiStatus = (status: string | null | undefined): string => {
    const value = String(status ?? "").trim().toLowerCase();
    if (!value) return "pending";
    if (value === "rejected" || value === "declined" || value === "denied") return "rejected";
    if (value === "verified" || value === "approved" || value === "active") return "verified";
    return value;
  };

  const resolveIdentityRequirementStatus = (): string => {
    const recordStatus = normalizeUiStatus(identityData?.status);
    if (recordStatus === "rejected") return "rejected";
    if (verificationSummary?.checks?.identity === true) return "verified";
    if (recordStatus === "verified") return "verified";
    return "pending";
  };

  const resolveInsuranceRequirementStatus = (): string => {
    if (insuranceData.some((item) => normalizeUiStatus(item.status) === "rejected")) {
      return "rejected";
    }
    if (verificationSummary?.checks?.insurance === true) return "verified";
    if (insuranceData.some((item) => normalizeUiStatus(item.status) === "verified")) {
      return "verified";
    }
    if (insuranceData.length > 0) return "pending";
    return "pending";
  };

  const resolveQualificationsRequirementStatus = (): string => {
    if (qualificationsEvidence.some((item) => normalizeUiStatus(item.status) === "rejected")) {
      return "rejected";
    }
    if (verificationSummary?.checks?.certificate === true) return "verified";
    if (qualificationsEvidence.some((item) => normalizeUiStatus(item.status) === "verified")) {
      return "verified";
    }
    if (qualificationsEvidence.length > 0) return "pending";
    return "pending";
  };

  const extractRejectionNote = (record: Record<string, unknown> | null | undefined): string | null => {
    if (!record) return null;
    const keys = [
      "reject_reason",
      "rejection_reason",
      "reject_note",
      "admin_note",
      "note",
      "comments",
      "remark",
    ];
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  const rejectionGuidanceByRequirement: Record<string, string> = {
    identity:
      "Your identity document was rejected by admin. Please upload a clear, valid government-issued ID.",
    qualifications:
      "Your qualification certificate was rejected. Please upload an updated or clearer certificate document.",
    insurance:
      "Your insurance document was rejected. Please upload valid insurance coverage documents.",
  };

  const getRequirementRejectionNote = (requirementId: string): string | null => {
    if (requirementId === "identity") {
      return extractRejectionNote(identityData as unknown as Record<string, unknown>);
    }
    if (requirementId === "qualifications") {
      const rejected = qualificationsEvidence.find(
        (item) => normalizeUiStatus(item.status) === "rejected"
      );
      return extractRejectionNote(rejected as unknown as Record<string, unknown>);
    }
    if (requirementId === "insurance") {
      const rejected = insuranceData.find((item) => normalizeUiStatus(item.status) === "rejected");
      return extractRejectionNote(rejected as unknown as Record<string, unknown>);
    }
    return null;
  };

  // Helper function to format price
  const formatPrice = (price: string | null | undefined): string => {
    if (price == null || price === "") return "N/A";
    try {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum)) return price;
      // Format as currency with appropriate scale
      if (priceNum >= 1000000) {
        return `£${(priceNum / 1000000).toFixed(1)}M`;
      } else if (priceNum >= 1000) {
        // For values >= 1000, show as K or full amount with commas
        if (priceNum >= 10000) {
          return `£${(priceNum / 1000).toFixed(0)}K`;
        }
        return `£${priceNum.toLocaleString('en-GB')}`;
      }
      return `£${priceNum.toLocaleString('en-GB')}`;
    } catch (e) {
      return price;
    }
  };

  // Helper function to format expire date
  const formatExpireDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Get insurance details from fetched data
  const getInsuranceDetails = () => {
    if (!insuranceData || insuranceData.length === 0) {
      return {
        publicLiability: "£5M",
        professionalIndemnity: "£2M",
        provider: "AXA Insurance",
        validUntil: "Dec 2025"
      };
    }

    const titleLower = (title: string | null | undefined) => (title ?? "").toLowerCase();

    // Try to find insurance items by title (API may return null title after document-only create)
    const publicLiabilityItem = insuranceData.find(item =>
      titleLower(item.title).includes("public liability") ||
      titleLower(item.title).includes("liability")
    );
    const professionalIndemnityItem = insuranceData.find(item =>
      titleLower(item.title).includes("professional indemnity") ||
      titleLower(item.title).includes("indemnity")
    );

    // Use found items or fallback to first/second items from API
    // First item for Public Liability, second item for Professional Indemnity
    const plItem = publicLiabilityItem || insuranceData[0];
    const piItem = professionalIndemnityItem || (insuranceData.length > 1 ? insuranceData[1] : insuranceData[0]);

    // Get the most recent expire date for "Valid Until"
    const allExpireDates = insuranceData.map(item => item.expire_date).filter(Boolean);
    const latestExpireDate = allExpireDates.length > 0 
      ? allExpireDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    // Get provider name from first item or default
    const provider = insuranceData[0]?.provider_name || "AXA Insurance";

    return {
      publicLiability: plItem ? formatPrice(plItem.price) : "£5M",
      professionalIndemnity: piItem ? formatPrice(piItem.price) : "£2M",
      provider: provider,
      validUntil: latestExpireDate ? formatExpireDate(latestExpireDate) : "Dec 2025"
    };
  };

  // Get insurance verified date from fetched data
  const getInsuranceVerifiedDate = () => {
    if (!insuranceData || insuranceData.length === 0) {
      return verificationSummary?.checks?.insurance ? "Oct 17, 2024" : null;
    }

    // Get the most recent updated_at date
    const allDates = insuranceData
      .map(item => item.updated_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return allDates.length > 0 ? formatDate(allDates[0]) : null;
  };

  const requirements = [
    {
      id: "identity",
      title: "Identity Verification",
      description: "Government-issued ID verified",
      status: resolveIdentityRequirementStatus(),
      verifiedDate: identityData?.updated_at ? formatDate(identityData.updated_at) : null,
      file: identityData?.file || null,
      icon: Shield
    },
    {
      id: "qualifications",
      title: "Professional Qualifications",
      description: "Fire Safety Diploma, NEBOSH Certificate",
      status: resolveQualificationsRequirementStatus(),
      verifiedDate: qualificationsEvidence.length > 0 
        ? (() => {
            // Find the most recent evidence item (by created_at date)
            const sortedEvidence = [...qualificationsEvidence].sort((a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA; // Sort descending (newest first)
            });
            const mostRecent = sortedEvidence[0];
            return mostRecent && mostRecent.created_at 
              ? formatDate(mostRecent.created_at)
              : null;
          })()
        : null,
      icon: Award,
      documents: qualificationsEvidence.map((item) => {
        // Use evidence if available, otherwise fall back to file
        const evidenceOrFile = item.evidence || item.file || '';
        
        // Extract filename from URL or use evidence as filename
        let fileName = evidenceOrFile;
        let fileUrl = evidenceOrFile;
        
        // If it's already a full URL, use it directly
        // Otherwise, construct the full URL from the base URL
        if (evidenceOrFile && !evidenceOrFile.includes('http://') && !evidenceOrFile.includes('https://')) {
          // It's a filename, construct the full URL
          const baseUrl = resolveApiBaseUrl();
          const apiBaseUrl = baseUrl.replace(/\/api\/?$/, "");
          fileUrl = `${apiBaseUrl}/certificates/${evidenceOrFile}`;
        }
        
        if (evidenceOrFile && evidenceOrFile.includes('/')) {
          // Extract filename from URL
          const urlParts = evidenceOrFile.split('/');
          fileName = urlParts[urlParts.length - 1];
        }
        
        return {
          name: fileName,
          uploadedOn: item.created_at ? formatDate(item.created_at) : formatDate(new Date().toISOString()),
          url: fileUrl, // Store the full URL for viewing
          id: item.id // Store the evidence ID for updates
        };
      })
    },
    {
      id: "insurance",
      title: "Insurance Coverage",
      description: "Public Liability & Professional Indemnity",
      status: resolveInsuranceRequirementStatus(),
      verifiedDate: getInsuranceVerifiedDate(),
      icon: Shield,
      details: getInsuranceDetails(),
      documents: insuranceData.map((item) => {
        // Use title as display name
        let fileName = item.title || "Insurance Document";
        let fileUrl = item.document || "";
        
        // If it's already a full URL, use it directly
        // Otherwise, construct the full URL from the base URL
        if (fileUrl && !fileUrl.includes('http://') && !fileUrl.includes('https://')) {
          // It's a filename, construct the full URL
          const baseUrl = resolveApiBaseUrl();
          const apiBaseUrl = baseUrl.replace(/\/api\/?$/, "");
          fileUrl = `${apiBaseUrl}/image/${fileUrl}`;
        }
        
        // If we don't have a title, try to extract filename from URL
        if (!fileName && item.document && item.document.includes('/')) {
          const urlParts = item.document.split('/');
          fileName = urlParts[urlParts.length - 1] || "Insurance Document";
        }
        
        return {
          name: fileName,
          uploadedOn: item.created_at ? formatDate(item.created_at) : formatDate(new Date().toISOString()),
          url: fileUrl, // Store the full document URL for viewing
          id: item.id, // Store the insurance ID
          title: item.title, // Store the insurance title
          price: item.price, // Store the price
          provider: item.provider_name, // Store the provider
          expireDate: item.expire_date, // Store the expire date
          status: item.status // Store the status
        };
      })
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "rejected":
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    // Display the actual status value from API dynamically
    // Map colors based on status value
    let badgeClass = "bg-gray-100 text-gray-700";
    if (status === "verified") {
      badgeClass = "bg-green-100 text-green-700";
    } else if (status === "pending") {
      badgeClass = "bg-yellow-100 text-yellow-700";
    } else if (status === "rejected") {
      badgeClass = "bg-red-100 text-red-700";
    }
    
    return <Badge className={badgeClass}>{status || "Not Submitted"}</Badge>;
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  /** Downscale raster images before insurance create — avoids client timeout and PHP post size limits on huge PNG payloads. */
  const imageFileToCompressedDataUrl = async (
    file: File,
    maxEdge = 2048,
    quality = 0.88
  ): Promise<string> => {
    if (typeof createImageBitmap !== "function") {
      return fileToBase64(file);
    }
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      let w = bitmap.width;
      let h = bitmap.height;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return fileToBase64(file);
      ctx.drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", quality);
    } catch {
      return fileToBase64(file);
    } finally {
      bitmap?.close();
    }
  };

  // Fetch identity data (extracted to a function so we can call it after upload)
  const fetchIdentityData = async () => {
    try {
      setIsLoadingIdentity(true);
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching identity");
        return;
      }

      const response = await getProfessionalWiseIdentity({ api_token: apiToken });
      
      if (response.status === true && response.data && response.data.length > 0) {
        // Use the first identity item (most recent)
        setIdentityData(response.data[0]);
      } else {
        setIdentityData(null);
      }
    } catch (err: any) {
      console.error("Error fetching identity:", err);
      setIdentityData(null);
    } finally {
      setIsLoadingIdentity(false);
    }
  };

  const handleFileButtonClick = (requirementId: string, evidenceId?: number) => {
    console.log('handleFileButtonClick - requirementId:', requirementId, 'evidenceId:', evidenceId);
    setCurrentUploadRequirement(requirementId);
    setCurrentEvidenceId(evidenceId || null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const requirementId = currentUploadRequirement;
    if (!requirementId) {
      console.error("No requirement ID set for file upload");
      return;
    }

    // Validate file type (allow images, PDFs, Word, Excel, etc.)
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];
    const allValidTypes = [...imageTypes, ...documentTypes];
    
    // Also check by file extension for compatibility
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    
    if (!allValidTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      toast.error("Please select an image file (JPEG, PNG, GIF), PDF, Word, Excel, or PowerPoint document.");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setCurrentUploadRequirement(null);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB.");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setCurrentUploadRequirement(null);
      return;
    }

    const apiToken = getApiToken();
    const professionalId = getProfessionalId();

    const isInsuranceCreate = requirementId === "insurance" && currentEvidenceId == null;
    const isIdentityCreate = requirementId === "identity" && !identityData?.id;

    if (!apiToken) {
      toast.error("Please log in to upload document.");
      setCurrentUploadRequirement(null);
      return;
    }

    if (!professionalId && !isInsuranceCreate && !isIdentityCreate) {
      toast.error("Professional ID not found. Please try again.");
      setCurrentUploadRequirement(null);
      return;
    }

    // Note: identity create does not require an existing record; qualifications can create new evidence too

    setUploadingDoc(requirementId);

    try {
      // Determine if file is an image or document
      const isImage = imageTypes.includes(file.type) || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
      
      let fileToSend: string | File;
      
      if (isImage) {
        // For images: convert to base64 and send as JSON body
        fileToSend = await fileToBase64(file);
      } else {
        // For documents (PDF, Word, Excel, etc.): send File object as FormData
        fileToSend = file;
      }

      // Call the appropriate update API based on requirement type
      if (requirementId === "identity") {
        const response =
          identityData?.id && professionalId
            ? await updateProfessionalIdentity({
                api_token: apiToken,
                id: identityData.id,
                professional_id: professionalId,
                file: fileToSend,
              })
            : await createProfessionalIdentity({
                api_token: apiToken,
                file: fileToSend,
              });

        if (response.status === true || response.data) {
          toast.success(
            response.message ||
              (identityData?.id
                ? "Identity document updated successfully!"
                : "Identity document uploaded successfully!")
          );
          await fetchIdentityData();
          await fetchVerificationSummary();
        } else {
          toast.error(response.message || "Failed to upload identity document.");
        }
      } else if (requirementId === "qualifications") {
        // fileToSend is already determined above:
        // - For images: base64 string (will be sent as JSON body)
        // - For documents (PDF, Word, Excel, etc.): File object (will be sent as FormData)
        
        if (currentEvidenceId) {
          // Update existing evidence
          const response = await updateEvidence({
            api_token: apiToken,
            id: currentEvidenceId,
            professional_id: professionalId!,
            evidence: fileToSend, // base64 string (images) or File object (documents)
          });

          if (response.status === true || response.success === true || response.data) {
            toast.success(response.message || "Qualification evidence updated successfully!");
            // Immediately refresh the qualifications evidence data
            await fetchQualificationsEvidence();
          } else {
            toast.error(response.message || "Failed to update qualification evidence.");
          }
        } else {
          // Create new evidence (fallback, though this shouldn't happen with Update button)
          const fileName = file.name;
          const response = await createCertification({
            api_token: apiToken,
            certificate_name: fileName,
            description: `Qualification document: ${fileName}`,
            evidence: fileToSend, // base64 string (images) or File object (documents)
            status: "pending",
            professional_id: professionalId!,
          });

          if (response.status === "success" || response.success === true || response.data) {
            toast.success(response.message || "Qualification document uploaded successfully!");
            // Immediately refresh the qualifications evidence data
            await fetchQualificationsEvidence();
          } else {
            toast.error(response.message || "Failed to upload qualification document.");
          }
        }
      } else if (requirementId === "insurance") {
        const insuranceIdToUpdate = currentEvidenceId;

        if (insuranceIdToUpdate) {
          // Update existing insurance row (needs insurance id + professional id)
          const response = await updateInsuranceDocument({
            api_token: apiToken,
            id: insuranceIdToUpdate,
            professional_id: professionalId!,
            document: fileToSend,
          });

          if (response.status === true || response.success === true || response.data) {
            toast.success(response.message || "Insurance document updated successfully!");
            await fetchInsuranceData();
            await fetchVerificationSummary();
          } else {
            toast.error(response.message || "Failed to update insurance document.");
          }
        } else {
          // First document: POST /insurance-coverage/create_document — { api_token, document }
          let documentPayload: string;
          if (isImage) {
            documentPayload = await imageFileToCompressedDataUrl(file);
          } else {
            documentPayload = await fileToBase64(file);
          }

          const response = await createInsuranceDocument({
            api_token: apiToken,
            document: documentPayload,
          });

          const ok =
            response.status === true ||
            response.status === "success" ||
            response.success === true ||
            response.data != null;

          if (ok) {
            toast.success(response.message || "Insurance document uploaded successfully!");
            await fetchInsuranceData();
            await fetchVerificationSummary();
          } else {
            toast.error(response.message || response.error || "Failed to upload insurance document.");
          }
        }
      }
    } catch (error: any) {
      console.error(`Error uploading ${requirementId} document:`, error);
      const detail =
        (typeof error?.message === "string" && error.message) ||
        (typeof error?.error === "string" && error.error) ||
        "";
      toast.error(
        detail || `Failed to upload ${requirementId} document. Please try again.`
      );
    } finally {
      setUploadingDoc(null);
      setCurrentUploadRequirement(null);
      setCurrentEvidenceId(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Verification Status</h1>
        <p className="text-gray-600">Your professional verification and credentials</p>
      </div>

      {/* Overall Status */}
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{verificationSummary?.title || "Fully Verified Professional"}</h2>
                <p className="text-green-100">{verificationSummary?.subtitle || "All verification requirements completed"}</p>
              </div>
            </div>
            <Badge className="bg-white text-green-600 text-lg px-4 py-2">
              <CheckCircle className="w-5 h-5 mr-2" />
              {verificationSummary?.active_status || "Active"}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-100">Verification Progress</span>
              <span className="font-semibold">{verificationStatus.completionPercentage}%</span>
            </div>
            <Progress value={verificationStatus.completionPercentage} className="h-3 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Benefits of Verification */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-2">Benefits of Being Verified</p>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>✓ Appear higher in search results</li>
                <li>✓ Display "Verified Professional" badge on your profile</li>
                <li>✓ Gain customer trust and increase bookings</li>
                <li>✓ Access to premium features and support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Requirements */}
      <div className="space-y-4">
        <h2 className="text-xl text-[#0A1A2F]">Verification Requirements</h2>
        
        {/* Hidden file input for all uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {requirements.map((requirement) => (
          <Card key={requirement.id}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <requirement.icon className="w-6 h-6 text-gray-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg text-[#0A1A2F]">{requirement.title}</h3>
                        {getStatusBadge(requirement.status)}
                      </div>
                      <p className="text-sm text-gray-600">{requirement.description}</p>
                    </div>
                    {getStatusIcon(requirement.status)}
                  </div>

                  {requirement.status === "verified" && requirement.verifiedDate && (
                    <div className="mt-3">
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Verified on {requirement.verifiedDate}
                      </p>
                    </div>
                  )}

                  {requirement.status === "rejected" && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-medium text-red-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        Rejected by admin
                      </p>
                      <p className="text-sm text-red-800 mt-1">
                        {getRequirementRejectionNote(requirement.id) ||
                          rejectionGuidanceByRequirement[requirement.id] ||
                          "This verification was rejected. Please update your documents and submit again."}
                      </p>
                      <p className="text-xs text-red-700 mt-2">
                        Use <span className="font-medium">Update Document</span> below to upload a corrected file for admin review.
                      </p>
                    </div>
                  )}

                  {requirement.id === "identity" && isLoadingIdentity && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading identity verification...</span>
                      </div>
                    </div>
                  )}

                  {requirement.id === "identity" && requirement.file && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</p>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-2 min-w-0 w-full md:flex-1">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-900">Identity Document</p>
                              <p className="text-xs text-gray-500">
                                {requirement.verifiedDate
                                  ? `Verified ${requirement.verifiedDate}`
                                  : "Uploaded document"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 w-full justify-end md:w-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(requirement.file || "", "_blank")}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileButtonClick(requirement.id)}
                              disabled={uploadingDoc === requirement.id || isLoadingIdentity}
                            >
                              {uploadingDoc === requirement.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-1" />
                                  Update Document
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {requirement.documents && requirement.documents.length > 0 && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</p>
                      <div className="space-y-2">
                        {requirement.documents.map((doc, index) => {
                          // For insurance, show additional details (price, provider, expire date)
                          const isInsurance = requirement.id === "insurance";
                          const docAny = doc as any;
                          
                          // Use the document ID as the key to ensure React correctly tracks each item
                          const docKey = docAny.id || `doc-${index}`;
                          
                          return (
                            <div key={docKey} className="p-2 bg-gray-50 rounded space-y-2">
                              {isInsurance ? (
                                <>
                                  {/* Title and details outside document section - using individual item data */}
                                  <div className="space-y-2">
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-xs text-gray-500">Public Liability</p>
                                        <p className="text-sm font-medium text-gray-900">{docAny.title ? formatPrice(docAny.title) : 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Professional Indemnity</p>
                                        <p className="text-sm font-medium text-gray-900">{docAny.price ? formatPrice(docAny.price) : 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Provider</p>
                                        <p className="text-sm font-medium text-gray-900">{docAny.provider || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Valid Until</p>
                                        <p className="text-sm font-medium text-gray-900">{docAny.expireDate ? formatExpireDate(docAny.expireDate) : 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Document section separate */}
                                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pt-2 border-t border-gray-200">
                                    <div className="flex items-start gap-2 min-w-0">
                                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                      <span className="text-sm text-gray-700 break-words min-w-0">Document</span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 flex-shrink-0 w-full md:w-auto">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          // Use the stored URL from the document (same as Identity)
                                          const urlToOpen = (doc as any).url || '';
                                          window.open(urlToOpen, '_blank');
                                        }}
                                      >
                                        View
                                      </Button>
                                      {requirement.id === "insurance" && (doc as any).id && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleFileButtonClick("insurance", (doc as any).id)}
                                          disabled={uploadingDoc === "insurance" && currentEvidenceId === (doc as any).id}
                                        >
                                          {(uploadingDoc === "insurance" && currentEvidenceId === (doc as any).id) ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <>
                                              <Upload className="w-4 h-4 mr-1" />
                                              Update Document
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="flex items-start gap-2 min-w-0 w-full md:flex-1">
                                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className="text-sm text-gray-900 max-md:break-all"
                                        title={doc.name}
                                      >
                                        {doc.name}
                                      </p>
                                      <p className="text-xs text-gray-500">Uploaded {doc.uploadedOn}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 w-full justify-end md:w-auto">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        const urlToOpen = (doc as any).url || doc.name;
                                        if (urlToOpen.includes('http://') || urlToOpen.includes('https://')) {
                                          window.open(urlToOpen, '_blank');
                                        } else {
                                          const baseUrl = resolveApiBaseUrl();
                                          const apiBaseUrl = baseUrl.replace(/\/api\/?$/, "");
                                          window.open(`${apiBaseUrl}/certificates/${urlToOpen}`, '_blank');
                                        }
                                      }}
                                    >
                                      View
                                    </Button>
                                    {requirement.id === "qualifications" && (doc as any).id && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleFileButtonClick("qualifications", (doc as any).id)}
                                        disabled={uploadingDoc === "qualifications" && currentEvidenceId === (doc as any).id}
                                      >
                                        {(uploadingDoc === "qualifications" && currentEvidenceId === (doc as any).id) ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <>
                                            <Upload className="w-4 h-4 mr-1" />
                                            Update Document
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {requirement.details && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                  
                    </div>
                  )}

                  {requirement.id === "identity" && !requirement.file && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileButtonClick(requirement.id)}
                        disabled={uploadingDoc === requirement.id || isLoadingIdentity}
                      >
                        {uploadingDoc === requirement.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {identityData ? "Update Document" : "Upload Document"}
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {requirement.id === "insurance" && insuranceData.length === 0 && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentEvidenceId(null);
                          handleFileButtonClick("insurance");
                        }}
                        disabled={uploadingDoc === "insurance"}
                      >
                        {uploadingDoc === "insurance" ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Document
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Support — hidden per product request
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg text-[#0A1A2F] mb-1">Need Help with Verification?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Our team is here to assist you with any questions about the verification process.
              </p>
              <Button variant="outline">Contact Support</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      */}
    </div>
  );
}