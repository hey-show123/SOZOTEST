import Chat from './components/Chat';
import ModeSelector from './components/ModeSelector';
import { ChatModeProvider } from './context/ChatModeContext';
import { VoiceProvider } from './context/VoiceContext';
import { ModelProvider } from './context/ModelContext';

export default function Home() {
  return (
    <ChatModeProvider>
      <ModelProvider>
        <VoiceProvider>
          <main className="flex min-h-screen flex-col items-center justify-between p-2 sm:p-4 md:p-6 lg:p-8">
            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-4">
              <h1 className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-4 pt-6 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                AI会話アシスタント
              </h1>
            </div>
            
            <div className="w-full max-w-5xl mt-16 lg:mt-2">
              <ModeSelector />
              <Chat />
            </div>

            <div className="w-full mt-6">
              <p className="fixed bottom-0 left-0 flex w-full justify-center border-t border-gray-300 bg-gradient-to-t from-white via-white dark:from-black dark:via-black py-2 text-center text-xs">
                © {new Date().getFullYear()} SOZOの教室
              </p>
        </div>
      </main>
        </VoiceProvider>
      </ModelProvider>
    </ChatModeProvider>
  );
}
