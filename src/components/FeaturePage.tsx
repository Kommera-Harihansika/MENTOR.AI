import React from 'react';
import { motion } from 'motion/react';

interface FeaturePageProps {
  id?: string;
  headline: string;
  description: string;
  agentName?: string;
  agentDescription?: string;
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
  darkMode?: boolean;
}

export const FeaturePage: React.FC<FeaturePageProps> = ({
  id,
  headline,
  description,
  agentName,
  agentDescription,
  children,
  actionButton,
  secondaryAction,
  output,
  hasOutput = false,
  darkMode = false,
}) => {
  const bg = darkMode ? 'bg-gray-950' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';

  return (
    <div id={id || 'feature-page-container'} className={`w-full max-w-[720px] mx-auto px-4 py-8 md:py-12 ${bg}`}>
      {/* Agent Badge */}
      {agentName && (
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              {agentName}
            </span>
          </div>
          {agentDescription && (
            <span className={`text-xs ${textMuted} hidden sm:block`}>{agentDescription}</span>
          )}
        </div>
      )}

      {/* Headline & Description */}
      <header className="mb-8 text-left">
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${textPrimary} mb-2 leading-snug`}>
          {headline}
        </h1>
        <p className={`text-sm sm:text-base ${textMuted} leading-relaxed max-w-[580px]`}>
          {description}
        </p>
      </header>

      {/* Input Surface */}
      <div className="space-y-5">
        <div className="w-full">{children}</div>

        {/* Action Buttons */}
        {(actionButton || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {actionButton && (
              <button
                id={actionButton.id || 'primary-action-btn'}
                type="button"
                onClick={actionButton.onClick}
                disabled={actionButton.disabled || actionButton.loading}
                className="flex-1 sm:flex-none sm:min-w-[200px] py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                {actionButton.loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {actionButton.loadingLabel || 'Processing...'}
                  </>
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
                className={`px-5 py-3.5 text-sm font-semibold ${textMuted} hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-xl cursor-pointer border ${borderColor}`}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Output Area */}
      {hasOutput && output && (
        <motion.div
          id="feature-revealed-output"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`mt-10 pt-8 border-t ${borderColor}`}
        >
          {output}
        </motion.div>
      )}
    </div>
  );
};
