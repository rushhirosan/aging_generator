export default function LoadingStep() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-950">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 border-2 border-stone-800 rounded-full" />
          <div className="absolute inset-0 border-t-2 border-stone-300 rounded-full animate-spin" />
        </div>
        <p className="text-stone-200 font-medium text-lg mb-2">
          未来の自分を呼び出しています...
        </p>
        <p className="text-stone-600 text-sm">30〜60秒かかる場合があります</p>
      </div>
    </div>
  );
}
