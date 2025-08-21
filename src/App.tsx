import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Hero from './components/Hero'
import Pool from './pages/Pool'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/pool" element={<Pool />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
