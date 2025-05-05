export default function LandingPage() {
  const features = [
    "Summarizes promotional, transactional, and personal emails",
    "Answers questions like 'How much did I spend on Zomato last month?'",
    "Works directly in your browser — no data ever leaves your device",
    "Integrates with Gmail using Google OAuth, no manual setup",
    "Extracts key information like dates, prices, and locations",
    "Provides daily/weekly insight reports from inbox activity",
    "Zero storage — AI reads emails live and forgets instantly",
    "Open-source and transparent — audit how your data is used",
  ];

  return (
    <div className="h-full flex flex-col gap-6 justify-center items-center p-2">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-blue-700 leading-tight">
          A Better Way To Get Summarized Insights of Your Emails
        </h1>
        <p className="mt-4 text-lg md:text-xl text-blue-600">
          Simplify your inbox and stay informed effortlessly.
        </p>
      </header>
      <main className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-2 md:p-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-blue-700 mb-6">
          Features You'll Love
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((item, key) => (
            <li
              key={key}
              className="text-lg text-blue-600 flex items-start gap-2"
            >
              <span className="text-blue-500 mt-1">✔</span>
              {item}
            </li>
          ))}
        </ul>
      </main>
      <footer className="text-center text-blue-600 mt-8">
        <p className="text-sm">Made with ❤️ by Dhaval J Prasad</p>
      </footer>
    </div>
  );
}
