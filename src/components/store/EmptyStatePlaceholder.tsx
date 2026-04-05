import type { LucideIcon } from 'lucide-react';

type Props = {
    icon: LucideIcon;
    message: string;
    minHeightClass?: string;
};

export function EmptyStatePlaceholder({ icon: Icon, message, minHeightClass = 'min-h-[160px]' }: Props) {
    return (
        <div
            className={`flex ${minHeightClass} flex-col items-center justify-center gap-3 py-16 px-4 text-center`}
            role="status"
        >
            <Icon className="shrink-0 text-slate-300" strokeWidth={1.25} size={44} aria-hidden />
            <p className="max-w-sm text-sm text-slate-500">{message}</p>
        </div>
    );
}
