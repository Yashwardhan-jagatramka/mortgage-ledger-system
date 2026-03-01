export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-3 gap-6">
        <div className="card bg-base-100 shadow-md p-6">
          <h3 className="text-sm opacity-60">Total Documents</h3>
          <p className="text-2xl font-bold mt-2">12</p>
        </div>

        <div className="card bg-base-100 shadow-md p-6">
          <h3 className="text-sm opacity-60">Processing</h3>
          <p className="text-2xl font-bold mt-2 text-warning">3</p>
        </div>

        <div className="card bg-base-100 shadow-md p-6">
          <h3 className="text-sm opacity-60">Manual Required</h3>
          <p className="text-2xl font-bold mt-2 text-error">2</p>
        </div>
      </div>
    </div>
  );
}