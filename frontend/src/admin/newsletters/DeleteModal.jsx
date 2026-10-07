import { ConfirmDialog } from '../components/AdminPrimitives';

export default function DeleteModal({ isOpen, onClose, onConfirm, itemName, isDeleting, title = 'Delete Newsletter?' }) {
  return (
    <ConfirmDialog 
      open={isOpen}
      title={title}
      description={`You are about to permanently delete "${itemName}". All associated data will be lost.`}
      confirmLabel="Delete Permanently"
      variant="danger"
      loading={isDeleting}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
