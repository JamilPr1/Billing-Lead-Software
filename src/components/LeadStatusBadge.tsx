'use client';

interface LeadStatusBadgeProps {
  status: string;
}

export default function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const statusClasses: Record<string, string> = {
    NEW: 'badge badge-new',
    CONTACTED: 'badge badge-contacted',
    INTERESTED: 'badge badge-interested',
    NOT_INTERESTED: 'badge badge-not-interested',
    FOLLOW_UP: 'badge badge-follow-up',
    CONVERTED: 'badge badge-converted',
    DO_NOT_CALL: 'badge badge-do-not-call',
  };

  const statusLabels: Record<string, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    INTERESTED: 'Interested',
    NOT_INTERESTED: 'Not Interested',
    FOLLOW_UP: 'Follow Up',
    CONVERTED: 'Converted',
    DO_NOT_CALL: 'Do Not Call',
  };

  return (
    <span className={statusClasses[status] || 'badge'}>
      {statusLabels[status] || status}
    </span>
  );
}
