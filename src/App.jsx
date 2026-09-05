import UrlInput from './components/UrlInput'
import UrlList from './components/UrlList'
import { useUrls } from './hooks/useUrls'
import { urlStore } from './store/urlStore'
import './App.css'

export default function App() {
  const urls = useUrls()

  return (
    <div className="app">
      <header className="app__header">
        <h1>URL Chat</h1>
        {urls.length > 0 && (
          <button className="app__clear" onClick={() => urlStore.clear()}>
            Clear all
          </button>
        )}
      </header>

      <main className="app__body">
        <UrlList />
      </main>

      <footer className="app__footer">
        <UrlInput />
      </footer>
    </div>
  )
}
