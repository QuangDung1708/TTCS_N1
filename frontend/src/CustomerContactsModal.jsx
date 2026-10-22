import { CustomerDrawer } from "./screens/Customers";
export default function CustomerContactsModal({
  open,
  onClose,
  customerId,
  customer,
}) {
  return open ? (
    <CustomerDrawer
      id={customerId || customer?.id}
      onClose={onClose}
      onChanged={() => {}}
      onEdit={() => {}}
    />
  ) : null;
}
