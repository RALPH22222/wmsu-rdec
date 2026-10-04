
export default function ProponentDashboard() {
  return (
    <div className="bg-white p-12 shadow-sm rounded-sm">
      <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">Proponent Dashboard</h2>
      <p className="text-slate-600 mb-8 text-sm">Manage your research proposals and track their progress.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Placeholder Skeleton Cards */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-50 p-6 rounded-sm min-h-[150px] flex flex-col gap-4">
            <div className="h-6 w-3/4 bg-slate-200 animate-pulse rounded-sm"></div>
            <div className="h-4 w-1/2 bg-slate-200 animate-pulse rounded-sm"></div>
            <div className="mt-auto h-8 w-1/3 bg-slate-200 animate-pulse rounded-sm"></div>
          </div>
        ))}
      </div>
    </div>
  );
}