export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-amber-400" />
        <p className="mt-4 text-sm font-bold text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
