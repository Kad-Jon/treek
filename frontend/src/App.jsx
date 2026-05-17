import { useState, useEffect } from 'react'

function App() {
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetch('/api/')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
  }, [])

  return (
    <div>
      <h1>{message ?? 'Loading...'}</h1>
    </div>
  )
}

export default App
