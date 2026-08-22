import React from 'react';
import { motion } from 'motion/react';

interface FeaturePageProps {
  id?: string;
  headline: string;
  description: string;
  children: React.ReactNode;
  actionButton?: {
    label: string;
    loadingLabel?: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    id?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  output?: React.ReactNode;
  hasOutput?: boolean;
}

export const FeaturePage: React.FC<FeaturePageProps> = ({
  id,
  headline,
  description,
  children,
  actionButton,
  secondaryAction,
  output,
  hasOutput = false,
}) => {
  return (
    <div id={id || 'feature-page-container'} className="w-full max-w-[640px] mx-auto px-4 py-8 md:py-12">
      {/* 1. Above the Fold: Headline & One-liner Description */}
      <header className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
          {headline}
        </h1>
        <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-[560px] mx-auto">
          {description}
        </p>
      </header>

      {/* 2. Primary Interaction Area (Single Input Surface) */}
      <div className="space-y-6">
        <div className="w-full">
          {children}
        </div>

        {/* 3. Primary Action Button */}
        {(actionButton || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            {actionButton && (
              <button
                id={actionButton.id || 'primary-action-btn'}
                type="button"
                onClick={actionButton.onClick}
                disabled={actionButton.disabled || actionButton.loading}
                className="w-full py-4 bg-[#0066FF] text-white font-bold rounded-xl text-base hover:bg-blue-700 active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center cursor-pointer"
              >
                {actionButton.loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-1 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {actionButton.loadingLabel || 'Processing...'}
                  </span>
                ) : (
                  actionButton.label
                )}
              </button>
            )}

            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                className="w-full sm:w-auto px-5 py-4 text-sm font-semibold text-gray-500 hover:text-[#0066FF] hover:bg-blue-50/50 transition-colors rounded-xl text-center cursor-pointer"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Revealed Output Area (Appears below the fold ONLY after action) */}
      {hasOutput && output && (
        <motion.div
          id="feature-revealed-output"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mt-12 pt-8 border-t border-gray-200"
        >
          {output}
        </motion.div>
      )}
    </div>
  );
};
