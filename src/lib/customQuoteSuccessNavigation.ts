export type CustomQuoteSuccessLocationState = {
  showCustomQuoteSuccess?: boolean;
};

export function customQuoteSuccessNavigateState(): CustomQuoteSuccessLocationState {
  return { showCustomQuoteSuccess: true };
}
