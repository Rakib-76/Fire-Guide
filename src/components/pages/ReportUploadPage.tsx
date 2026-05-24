import React from "react";
import { useNavigate } from "react-router-dom";
import { ReportUpload } from "../ReportUpload";

export default function ReportUploadPage() {
  const navigate = useNavigate();

  return (
    <ReportUpload
      onBack={() => navigate("/professional/dashboard")}
    />
  );
}

