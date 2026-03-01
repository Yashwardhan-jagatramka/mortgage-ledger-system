type Props = {
  status: string;
};

export default function StatusBadge({ status }: Props) {
  const getClass = () => {
    switch (status) {
      case "COMPLETED":
        return "badge-success";
      case "PROCESSING":
        return "badge-warning";
      case "MANUAL_REQUIRED":
        return "badge-error";
      case "FAILED":
        return "badge-error";
      default:
        return "badge-neutral";
    }
  };

  return (
    <span className={`badge ${getClass()} badge-sm`}>
      {status.replace("_", " ")}
    </span>
  );
}