
export default function EvaluatorDashboard() {
  return (
    <div className="bg-white p-12 shadow-sm rounded-sm">
      <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">Evaluator Dashboard</h2>
      <p className="text-slate-600 mb-8 text-sm">Review assigned detailed proposals securely and anonymously.</p>
      
      <div className="flex flex-col gap-6">
        {/* Placeholder Skeleton Rows */}
        {[1, 2].map((i) => (
          <div key={i} className="bg-slate-50 p-6 rounded-sm flex justify-between items-center">
            <div className="flex flex-col gap-3 w-1/2">
              <div className="h-5 w-full bg-slate-200 animate-pulse rounded-sm"></div>
              <div className="h-4 w-1/3 bg-slate-200 animate-pulse rounded-sm"></div>
            </div>
            <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-sm"></div>
          </div>
        ))}
      </div>
    </div>
  );
}