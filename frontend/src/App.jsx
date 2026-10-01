import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [locating, setLocating] = useState(false)

  const [allSpecies, setAllSpecies] = useState([])
  const [query, setQuery] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const [result, setResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetch('/api/species')
      .then((r) => r.json())
      .then(setAllSpecies)
  }, [])

  const filtered = query.length > 0
    ? allSpecies.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 50)
    : []

  function requestLocation() {
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocationError('Could not get your location. Please allow access and try again.')
        setLocating(false)
      },
    )
  }

  function pickSpecies(name) {
    setSelectedSpecies(name)
    setQuery(name)
    setDropdownOpen(false)
    setResult(null)
    setSearchError(null)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    setSelectedSpecies('')
    setDropdownOpen(true)
    setActiveIdx(0)
    setResult(null)
  }

  function handleKeyDown(e) {
    if (!dropdownOpen || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pickSpecies(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
    }
  }

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (!inputRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function findTree() {
    if (!location || !selectedSpecies) return
    setSearching(true)
    setSearchError(null)
    setResult(null)
    try {
      const params = new URLSearchParams({
        species: selectedSpecies,
        lat: location.lat,
        lng: location.lng,
      })
      const res = await fetch(`/api/trees/nearest?${params}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.detail ?? 'Something went wrong')
      }
      setResult(await res.json())
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setSearching(false)
    }
  }

  const mapsUrl = result
    ? `https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lon}`
    : null

  const canSearch = location && selectedSpecies && !searching

  return (
    <div className="app">
      <h1>Tre<span>ek</span></h1>

      {/* Step 1 — location */}
      <div className="card">
        <span className="card-label">Your location</span>
        <div className="location-row">
          {location ? (
            <span className="location-text">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </span>
          ) : (
            <span className="location-text" style={{ color: '#aaa' }}>Not set</span>
          )}
          <button
            className="btn-primary btn-sm"
            onClick={requestLocation}
            disabled={locating}
          >
            {locating ? 'Locating…' : location ? 'Refresh' : 'Use my location'}
          </button>
        </div>
        {locationError && <p className="error">{locationError}</p>}
      </div>

      {/* Step 2 — species search */}
      <div className="card">
        <span className="card-label">Tree species</span>
        <div className="search-wrapper">
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search species…"
            value={query}
            onChange={handleInputChange}
            onFocus={() => query && setDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {dropdownOpen && filtered.length > 0 && (
            <div className="dropdown" ref={dropdownRef}>
              {filtered.map((name, i) => (
                <div
                  key={name}
                  className={`dropdown-item${i === activeIdx ? ' active' : ''}`}
                  onMouseDown={() => pickSpecies(name)}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Step 3 — find */}
      <button
        className="btn-primary"
        onClick={findTree}
        disabled={!canSearch}
      >
        {searching ? 'Searching…' : 'Find nearest tree'}
      </button>

      {searchError && <p className="error">{searchError}</p>}

      {result && (
        <div className="result-card">
          <p className="result-species">{result.common_name}</p>
          <p className="result-borough">{result.borough}</p>
          <a
            className="maps-link"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions →
          </a>
        </div>
      )}
    </div>
  )
}

export default App
