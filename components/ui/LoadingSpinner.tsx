export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black/12 border-t-[#9C2B44]" />
        <p className="mt-4 text-sm font-bold text-[#0A3161]/78">{message}</p>
      </div>
    </div>
  );
}
