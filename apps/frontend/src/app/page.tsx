import Image from "next/image";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-4">DaisyUI Test</h2>
        <button className="btn btn-primary w-full">
          DaisyUI Working
        </button>
      </div>
    </div>
  );
}