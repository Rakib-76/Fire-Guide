import React from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "../ui/button";
import type { QuestionnaireStepMeta } from "../../lib/questionnaireStepMeta";
import { getIconForOptionLabel } from "../../lib/questionnaireStepMeta";
import "../../styles/questionnaireOptionCard.css";

export type OptionCardItem = {
  value: string;
  label: React.ReactNode;
  helper?: React.ReactNode;
  icon?: LucideIcon;
};

/** Card grid selector — centered icon, title, example, radio indicator (screenshot-style). */
export function OptionCardSelect({
  value,
  onValueChange,
  options,
  disabled = false,
  loading = false,
  loadingText = "Loading options...",
  emptyText = "No options available",
  columns = "grid-cols-2 lg:grid-cols-4",
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: OptionCardItem[];
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  columns?: string;
}) {
  if (loading) {
    return (
      <div className="questionnaire-option-loading">
        <Loader2 className="h-5 w-5 animate-spin text-red-600" />
        {loadingText}
      </div>
    );
  }
  if (!options.length) {
    return (
      <div className="questionnaire-option-empty">{emptyText}</div>
    );
  }

  return (
    <div className={`questionnaire-option-grid ${columns}`}>
      {options.map((opt) => {
        const selected = value === opt.value;
        const labelText = typeof opt.label === "string" ? opt.label : String(opt.value);
        const Icon = opt.icon ?? getIconForOptionLabel(labelText);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onValueChange(opt.value)}
            aria-pressed={selected}
            className={`questionnaire-option-card${selected ? " questionnaire-option-card--selected" : ""}`}
          >
            {selected ? (
              <span className="questionnaire-option-card__badge" aria-hidden>
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            ) : null}

            <span className="questionnaire-option-card__icon-wrap">
              {Icon ? (
                <Icon className="questionnaire-option-card__icon" strokeWidth={1.5} aria-hidden />
              ) : (
                <span className="questionnaire-option-card__icon rounded-lg bg-white/60" />
              )}
            </span>

            <span className="questionnaire-option-card__label">{opt.label}</span>

            {opt.helper ? (
              <span className="questionnaire-option-card__helper">{opt.helper}</span>
            ) : (
              <span className="questionnaire-option-card__helper" aria-hidden />
            )}

            <span className="questionnaire-option-card__indicator" aria-hidden>
              {selected ? <Check className="questionnaire-option-card__indicator-icon" strokeWidth={3} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WhyWeAskPanel({ meta }: { meta: QuestionnaireStepMeta }) {
  const HeroIcon = meta.panelIcon.icon;

  return (
    <div className="questionnaire-why-panel">
      <div className="questionnaire-why-panel__hero">
        <div className="questionnaire-why-panel__hero-icon-wrap">
          <HeroIcon
            className="questionnaire-why-panel__hero-icon"
            strokeWidth={1.5}
            aria-label={meta.panelIcon.title}
          />
        </div>
      </div>
      <h3 className="questionnaire-why-panel__title">Why we ask this?</h3>
      <p className="questionnaire-why-panel__intro">{meta.whyIntro}</p>
      <ul className="questionnaire-why-panel__list">
        {meta.whyFeatures.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <li key={feature.title} className="questionnaire-why-panel__item">
              <span className="questionnaire-why-panel__icon-wrap">
                <FeatureIcon
                  className="questionnaire-why-panel__icon"
                  strokeWidth={1.75}
                  aria-label={feature.title}
                />
              </span>
              <div className="questionnaire-why-panel__item-text">
                <p className="questionnaire-why-panel__item-title">{feature.title}</p>
                <p className="questionnaire-why-panel__item-desc">{feature.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {meta.contextNote ? (
        <p className="questionnaire-why-panel__context-note">{meta.contextNote}</p>
      ) : null}
    </div>
  );
}

export function QuestionnaireStepShell({
  meta,
  currentStep,
  totalSteps,
  children,
  onBack,
  onContinue,
  continueDisabled,
  continueLabel,
  continueLoading,
  showContinue,
}: {
  meta: QuestionnaireStepMeta;
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
  onBack: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLabel: string;
  continueLoading?: boolean;
  showContinue: boolean;
}) {
  const progress = Math.round((currentStep / totalSteps) * 100);
  const QuestionIcon = meta.questionIcon;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="questionnaire-step-columns">
          <section className="questionnaire-step-section questionnaire-step-section--main">
            <div className="questionnaire-step-status">
              <div className="questionnaire-step-status__meta">
                <span>
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="questionnaire-step-status__time">
                  <Clock className="h-4 w-4" aria-hidden />
                  {meta.estimatedLabel}
                </span>
              </div>
              <div className="questionnaire-step-status__bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="questionnaire-step-status__bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="questionnaire-step-status__percent">{progress}% Complete</p>
            </div>

            <div className="questionnaire-step-page-header">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold text-[#0A1A2F] sm:text-2xl">{meta.pageTitle}</h1>
                <p className="mt-1 text-sm text-gray-600 sm:text-base">{meta.pageSubtitle}</p>
              </div>
              <div className="hidden shrink-0 sm:flex sm:items-center sm:gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Building2 className="h-8 w-8" strokeWidth={1.25} aria-hidden />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
                  <Shield className="h-5 w-5" aria-hidden />
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <QuestionIcon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#0A1A2F] sm:text-xl">{meta.questionTitle}</h2>
                <p className="mt-1 text-sm text-gray-600">{meta.questionSubtitle}</p>
              </div>
            </div>

            {children}
          </section>

          <section className="questionnaire-step-section questionnaire-step-section--aside" aria-label="Why we ask this">
            <WhyWeAskPanel meta={meta} />
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
          <Button type="button" variant="outline" onClick={onBack} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {showContinue ? (
            <Button
              type="button"
              onClick={onContinue}
              disabled={continueDisabled || continueLoading}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              {continueLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {continueLabel}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
