import { PasswordModal } from "../ui/Profile";
export default function ChangePasswordModal({ visible, open, onClose }) {
  return <PasswordModal open={open ?? visible} onClose={onClose} />;
}
