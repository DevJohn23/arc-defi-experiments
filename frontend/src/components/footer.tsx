export function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 bg-black/40 backdrop-blur-md py-8 mt-20">
      <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Lado Esquerdo: Branding */}
        <div className="text-center md:text-left">
          <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ArcDCA
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Automated strategies for the Arc Network.
          </p>
        </div>

        {/* Lado Direito: Links e Copyright */}
        <div className="flex flex-col items-center md:items-end gap-2 text-sm text-gray-400">
          <div className="flex gap-6">
            <a href="https://github.com/DevJohn23/arc-defi-experiments" target="_blank" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://x.com/Johnx235" target="_blank" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Built with ❤️ on Arc Testnet. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}