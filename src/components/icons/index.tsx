import {
  Check,
  Edit,
  Trash2,
  Users,
  ArrowRightLeft,
  User,
  Save,
  X,
  CheckCircle,
  DollarSign,
  Loader2,
} from "lucide-react";

interface IconProps {
  className?: string;
}

// Loading spinner component
export const LoadingSpinner = ({ className = "w-4 h-4" }: IconProps) => (
  <Loader2 className={`${className} animate-spin`} />
);

// Icon components using Lucide React
export const CheckIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <Check className={className} />
);

export const EditIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <Edit className={className} />
);

export const DeleteIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <Trash2 className={className} />
);

export const UsersIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <Users className={className} />
);

export const ArrowsIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <ArrowRightLeft className={className} />
);

export const UserProfileIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <User className={className} />
);

export const SaveIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <Save className={className} />
);

export const CloseIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <X className={className} />
);

export const CheckCircleIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <CheckCircle className={className} />
);

export const CurrencyIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <DollarSign className={className} />
);
