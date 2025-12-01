import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface CustomAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}

export const CustomAlert = ({ isOpen, onClose, title, message, type = 'info' }: CustomAlertProps) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
      case 'warning':
        return <AlertCircle className="w-12 h-12 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      default:
        return <AlertCircle className="w-12 h-12 text-magic-gold" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'error':
      case 'warning':
        return 'border-red-500/50';
      case 'success':
        return 'border-green-500/50';
      default:
        return 'border-magic-gold/50';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-magic-black border-2 ${getBorderColor()} rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-magic-yellow/60 hover:text-magic-yellow transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            {getIcon()}
          </div>

          {title && (
            <h3 className="text-xl font-bold text-magic-gold mb-3">
              {title}
            </h3>
          )}

          <p className="text-magic-yellow text-base leading-relaxed mb-6">
            {message}
          </p>

          <button
            onClick={onClose}
            className="bg-magic-gold text-magic-black px-8 py-3 rounded-xl font-bold hover:bg-magic-yellow transition-all shadow-lg hover:shadow-magic-gold/50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
