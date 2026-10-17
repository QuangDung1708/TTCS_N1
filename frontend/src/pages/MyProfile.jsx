import { useNavigate } from "react-router-dom";
import { ProfileDrawer } from "../ui/Profile";
export default function MyProfile() {
  const nav = useNavigate();
  return <ProfileDrawer open onClose={() => nav(-1)} />;
}
