import Header from './components/Header';

function App() {
  return (
    <main className="h-screen flex flex-col font-sfpro font-bold bg-white/85 backdrop-blur-md text-white rounded-[15px] drag">
      <Header />
      <section className="flex flex-row flex-1 w-full overflow-hidden justify-center items-center no-drag">
        <input
          placeholder="Type here"
          className="outline-none w-[300px] rounded-[5px] p-[15px] text-black bg-white/80"
        />
      </section>
    </main>
  );
}

export default App;
