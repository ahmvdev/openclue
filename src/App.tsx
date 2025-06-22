import { useState } from 'react';
import Header from './components/Header';
import { motion } from 'framer-motion';

function App() {
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState('');
  const [hasResized, setHasResized] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && text.trim() !== '' && !hasResized) {
      window.electron?.increaseHeightFromBottom(300);
      setHasResized(true)
    }
  };

  return (
    <main className="drag h-screen flex flex-col font-sfpro font-bold bg-gradient-to-br from-[#e8debe]/90 via-[#ffffff]/90 to-[#d4e4fc]/90 backdrop-blur-md text-white rounded-[15px]">
      <Header />
      <section className="flex flex-row flex-1 w-full overflow-hidden justify-center items-start mt-4 no-drag">
        <div className="relative">
          <input
            placeholder="Type here"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="outline-none w-[300px] rounded-[5px] p-[15px] text-black bg-white/80"
          />
          {isFocused && (
            <motion.div
              initial={{ opacity: 0, y: -7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="absolute top-full left-0 mt-1 text-sm ml-[250px] text-black flex items-center gap-1"
            >
              <span>↵</span>
              <span>Enter</span>
            </motion.div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
