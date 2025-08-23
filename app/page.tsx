export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">
          GPai Campus Case Competition
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          For IIT students only
        </p>
        <div className="space-y-4">
          <a
            href="/join"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Join Competition
          </a>
          <a
            href="/api/health"
            className="block text-sm text-gray-500 hover:text-gray-700"
          >
            System Status
          </a>
        </div>
      </div>
    </main>
  );
}