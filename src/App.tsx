import { useState } from 'react';
import Header from './components/Header';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';



function App() {
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState('');
  const [hasResized, setHasResized] = useState(false);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function sendToGemini(base64Image: string, prompt: string): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: base64Image.replace(/^data:image\/png;base64,/, ''),
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && text.trim() !== '') {
      setLoading(true);
      setResponse('');
      if (!hasResized) {
        await window.electron?.increaseHeightFromBottom(300);
        setHasResized(true);
      }

      const screenshot = await window.electron.takeScreenshot();
      const base64 = await blobToBase64(screenshot);
      const reply = await sendToGemini(base64, text.trim());

      setResponse(reply);
      setText('');
      setLoading(false);
    }
  };

  return (
    <main className="drag h-screen flex flex-col font-sfpro font-bold bg-gradient-to-br from-[#e8debe]/90 via-[#ffffff]/90 to-[#d4e4fc]/90 backdrop-blur-md text-white rounded-[15px]">
      <Header />

      <section className="no-drag flex justify-center items-start mt-4">
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

      <section className="no-drag flex-1 overflow-y-auto mt-4 px-4 text-black select-text">
        {loading && (
          <p className="animate-pulse px-6 text-gray-600 font-medium">Thinking...</p>
        )}

        {response && (
          <div className="mt-4 px-4 pb-4 max-w-full">
          <div className="prose px-4 overflow-x-hidden break-words [&_a]:break-words">
            <ReactMarkdown
             components={{
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                if (href) window.electron.openExternal(href);
              }}
              className="text-blue-600 underline break-words"
            >
              {children}
            </a>
          ),
        }}
            >{response}</ReactMarkdown>
          </div>
        </div>
        )}
      </section>
    </main>
  );
}

export default App;
