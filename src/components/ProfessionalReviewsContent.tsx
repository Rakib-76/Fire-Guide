import React, { useEffect, useMemo, useState } from "react";
import { Star, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { getApiToken } from "../lib/auth";
import { fetchProfessionalWiseReviews, type ReviewResponse } from "../api/reviewsService";

/** Parse a rating that the API returns as a string (e.g. "4", "4.5") into a number 0–5. */
function parseRating(raw: string | number | null | undefined): number {
  const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").trim());
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(5, num));
}

function formatReviewDate(dateStr: string | null | undefined): string {
  const raw = dateStr ? String(dateStr).trim() : "";
  if (!raw) return "";
  const date = new Date(raw.includes("T") ? raw : `${raw.replace(" ", "T")}`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitial(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "C";
}

/** Reviewer avatar: shows the profile image when available, falls back to the initial. */
function ReviewerAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const [showFallback, setShowFallback] = useState(false);
  const url = (imageUrl ?? "").trim();
  const canShowImage = url.length > 0 && !showFallback;

  return (
    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
      {canShowImage ? (
        <img
          src={url}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setShowFallback(true)}
        />
      ) : (
        <span className="text-lg font-semibold text-red-600">{getInitial(name)}</span>
      )}
    </div>
  );
}

/** Row of 5 stars; partials are rounded to nearest half visually via full/empty fill. */
function StarRating({ value, size = "w-4 h-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star - 0.25;
        return (
          <Star
            key={star}
            className={size}
            style={{
              fill: filled ? "#FFC107" : "#E5E7EB",
              color: filled ? "#FFC107" : "#D1D5DB",
            }}
          />
        );
      })}
    </div>
  );
}

export function ProfessionalReviewsContent() {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => {
    const token = getApiToken();
    if (!token) {
      setError("Not authenticated");
      setReviews([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProfessionalWiseReviews(token);
      setReviews(data);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to load reviews";
      setError(msg);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { averageRating, totalReviews, distribution } = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return { averageRating: 0, totalReviews: 0, distribution: [0, 0, 0, 0, 0] };
    }
    const dist = [0, 0, 0, 0, 0]; // index 0 => 1 star ... index 4 => 5 stars
    let sum = 0;
    reviews.forEach((review) => {
      const rating = parseRating(review.rating);
      sum += rating;
      const bucket = Math.min(5, Math.max(1, Math.round(rating)));
      dist[bucket - 1] += 1;
    });
    return {
      averageRating: sum / total,
      totalReviews: total,
      distribution: dist,
    };
  }, [reviews]);

  const sortedReviews = useMemo(
    () =>
      [...reviews].sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
      }),
    [reviews]
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[#0A1A2F] mb-2 text-2xl md:text-3xl font-semibold tracking-tight">
            Reviews
          </h1>
          <p className="text-gray-600">
            See what your customers are saying about your fire safety services.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadReviews}
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Average Rating</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold text-gray-900">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500 mb-1">/ 5</span>
            </div>
            <div className="mt-2">
              <StarRating value={averageRating} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
            <span className="text-3xl font-semibold text-gray-900">{totalReviews}</span>
            <p className="text-sm text-gray-500 mt-2">From your customers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-3">Rating Breakdown</p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star - 1];
                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-3 text-right">{star}</span>
                    <Star
                      className="w-3 h-3 shrink-0"
                      style={{ fill: "#FFC107", color: "#FFC107" }}
                    />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: "#FFC107" }}
                      />
                    </div>
                    <span className="w-6 text-right tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
              <p className="text-sm">Loading reviews...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadReviews}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Try again
              </Button>
            </div>
          ) : sortedReviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No reviews yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Completed jobs will collect reviews from your customers here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedReviews.map((review) => {
                const rating = parseRating(review.rating);
                const reviewerName = review.name?.trim() || review.creator?.full_name || "Customer";
                return (
                  <div
                    key={review.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:border-red-200 hover:bg-red-50/50 transition-all"
                  >
                    <ReviewerAvatar name={reviewerName} imageUrl={review.creator?.image} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{reviewerName}</h4>
                        {review.created_at ? (
                          <span className="text-xs text-gray-500">
                            {formatReviewDate(review.created_at)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mb-2">
                        <StarRating value={rating} />
                      </div>
                      {review.feedback ? (
                        <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                          {review.feedback}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No written feedback.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfessionalReviewsContent;
